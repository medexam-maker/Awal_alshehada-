/**
 * Media Storage Abstraction for C2 Visual Mastery Lab (diagram_labeling)
 * Backed by PostgreSQL BYTEA in media_assets.
 * Ensures content-addressing via sha256 and immutability.
 */
import { pool } from '../db/index';

export interface MediaAssetMetadata {
  id: string;
  name: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  sha256: string;
  width?: number | null;
  height?: number | null;
  kind: string;
  status: 'active' | 'archived';
  archivedAt?: string | null;
  createdAt: string;
}

export interface SaveMediaInput {
  ownerId?: string | null;
  name: string;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
  sha256: string;
  width?: number | null;
  height?: number | null;
  keywords?: string[];
  kind?: string;
}

export interface MediaStorage {
  saveAsset(input: SaveMediaInput): Promise<{ asset: MediaAssetMetadata; duplicate: boolean }>;
  getAssetBytes(id: string): Promise<{ data: Buffer; mimeType: string; sha256: string; status: string } | null>;
  getAssetMetadata(id: string): Promise<(MediaAssetMetadata & { keywords: string[]; referenceCount: number; questionIds: string[] }) | null>;
  searchAssets(params: { query?: string; includeArchived?: boolean; limit?: number; offset?: number }): Promise<{ assets: (MediaAssetMetadata & { keywords: string[]; referenceCount: number })[]; total: number }>;
  updateAsset(id: string, updates: { name?: string; keywords?: string[]; archived?: boolean }): Promise<MediaAssetMetadata | null>;
  isAssetArchivedOrUnknown(id: string): Promise<{ exists: boolean; isArchived: boolean }>;
}

export class PostgresMediaStorage implements MediaStorage {
  async saveAsset(input: SaveMediaInput): Promise<{ asset: MediaAssetMetadata; duplicate: boolean }> {
    // 1. Check if an asset with this sha256 already exists
    const existing = await pool.query(
      `SELECT id, name, file_name, mime_type, file_size, sha256, width, height, kind, status, archived_at, created_at
       FROM media_assets
       WHERE sha256 = $1`,
      [input.sha256]
    );

    if (existing.rows.length > 0) {
      const row = existing.rows[0];
      return {
        duplicate: true,
        asset: {
          id: String(row.id),
          name: String(row.name || row.file_name),
          fileName: String(row.file_name),
          mimeType: String(row.mime_type),
          fileSize: Number(row.file_size),
          sha256: String(row.sha256),
          width: row.width ? Number(row.width) : null,
          height: row.height ? Number(row.height) : null,
          kind: String(row.kind || 'diagram'),
          status: row.status === 'archived' ? 'archived' : 'active',
          archivedAt: row.archived_at ? new Date(row.archived_at).toISOString() : null,
          createdAt: new Date(row.created_at).toISOString(),
        },
      };
    }

    // 2. Insert new asset
    const storageKey = `diagrams/${input.sha256}`;
    const buffer = Buffer.from(input.bytes);
    const keywords = Array.isArray(input.keywords) ? input.keywords : [];
    const kind = input.kind || 'diagram';

    const insertRes = await pool.query(
      `INSERT INTO media_assets 
       (owner_id, storage_key, file_name, mime_type, file_size, data, name, keywords, sha256, width, height, kind, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active')
       RETURNING id, name, file_name, mime_type, file_size, sha256, width, height, kind, status, archived_at, created_at`,
      [
        input.ownerId || null,
        storageKey,
        input.fileName,
        input.mimeType,
        buffer.length,
        buffer,
        input.name,
        keywords,
        input.sha256,
        input.width ?? null,
        input.height ?? null,
        kind,
      ]
    );

    const row = insertRes.rows[0];
    return {
      duplicate: false,
      asset: {
        id: String(row.id),
        name: String(row.name || row.file_name),
        fileName: String(row.file_name),
        mimeType: String(row.mime_type),
        fileSize: Number(row.file_size),
        sha256: String(row.sha256),
        width: row.width ? Number(row.width) : null,
        height: row.height ? Number(row.height) : null,
        kind: String(row.kind || 'diagram'),
        status: 'active',
        archivedAt: null,
        createdAt: new Date(row.created_at).toISOString(),
      },
    };
  }

  async getAssetBytes(id: string): Promise<{ data: Buffer; mimeType: string; sha256: string; status: string } | null> {
    const res = await pool.query(
      `SELECT data, mime_type, sha256, status FROM media_assets WHERE id = $1`,
      [id]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      data: Buffer.isBuffer(row.data) ? row.data : Buffer.from(row.data || ''),
      mimeType: String(row.mime_type),
      sha256: String(row.sha256),
      status: String(row.status),
    };
  }

  async getAssetMetadata(id: string): Promise<(MediaAssetMetadata & { keywords: string[]; referenceCount: number; questionIds: string[] }) | null> {
    const res = await pool.query(
      `SELECT id, name, file_name, mime_type, file_size, sha256, width, height, kind, status, archived_at, created_at, keywords
       FROM media_assets
       WHERE id = $1`,
      [id]
    );
    if (res.rows.length === 0) return null;
    const row = res.rows[0];

    const questionIds = await this.getQuestionReferences(id);

    return {
      id: String(row.id),
      name: String(row.name || row.file_name),
      fileName: String(row.file_name),
      mimeType: String(row.mime_type),
      fileSize: Number(row.file_size),
      sha256: String(row.sha256),
      width: row.width ? Number(row.width) : null,
      height: row.height ? Number(row.height) : null,
      kind: String(row.kind || 'diagram'),
      status: row.status === 'archived' ? 'archived' : 'active',
      archivedAt: row.archived_at ? new Date(row.archived_at).toISOString() : null,
      createdAt: new Date(row.created_at).toISOString(),
      keywords: Array.isArray(row.keywords) ? row.keywords : [],
      referenceCount: questionIds.length,
      questionIds: questionIds.slice(0, 20),
    };
  }

  async searchAssets(params: {
    query?: string;
    includeArchived?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ assets: (MediaAssetMetadata & { keywords: string[]; referenceCount: number })[]; total: number }> {
    const limit = Math.min(50, Math.max(1, params.limit ?? 50));
    const offset = Math.max(0, params.offset ?? 0);
    const includeArchived = Boolean(params.includeArchived);
    const rawQuery = params.query ? params.query.trim() : '';

    // Escape wildcards % and _ and \
    const escapedQuery = rawQuery.replace(/[%_\\]/g, '\\$&');

    const whereClauses: string[] = [];
    const queryParams: any[] = [];
    let pIdx = 1;

    if (!includeArchived) {
      whereClauses.push(`m.status != 'archived'`);
    }

    if (rawQuery) {
      queryParams.push(rawQuery);
      const idParamIdx = pIdx++;
      queryParams.push(`%${escapedQuery}%`);
      const likeParamIdx = pIdx++;

      whereClauses.push(`(
        LOWER(m.id::text) = LOWER($${idParamIdx}) OR
        LOWER(m.name) LIKE LOWER($${likeParamIdx}) ESCAPE '\\' OR
        LOWER(m.file_name) LIKE LOWER($${likeParamIdx}) ESCAPE '\\' OR
        EXISTS (
          SELECT 1 FROM UNNEST(m.keywords) kw
          WHERE LOWER(kw) LIKE LOWER($${likeParamIdx}) ESCAPE '\\'
        )
      )`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS total FROM media_assets m ${whereSql}`,
      queryParams
    );
    const total = Number(countRes.rows[0]?.total || 0);

    const pageParams = [...queryParams, limit, offset];
    const limitParamIdx = pageParams.length - 1;
    const offsetParamIdx = pageParams.length;

    const pageRes = await pool.query(
      `SELECT m.id, m.name, m.file_name, m.mime_type, m.file_size, m.sha256, m.width, m.height, m.kind, m.status, m.archived_at, m.created_at, m.keywords,
              COALESCE(q.ref_count, 0)::int AS reference_count
       FROM media_assets m
       LEFT JOIN (
         SELECT (content::jsonb)->'diagram'->>'assetId' AS asset_id, COUNT(*)::int AS ref_count
         FROM question_bank
         WHERE question_type = 'diagram_labeling' AND (content::jsonb)->'diagram'->>'assetId' IS NOT NULL
         GROUP BY (content::jsonb)->'diagram'->>'assetId'
       ) q ON m.id::text = q.asset_id
       ${whereSql}
       ORDER BY m.created_at DESC
       LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}`,
      pageParams
    );

    const assets = pageRes.rows.map((row: any) => ({
      id: String(row.id),
      name: String(row.name || row.file_name),
      fileName: String(row.file_name),
      mimeType: String(row.mime_type),
      fileSize: Number(row.file_size),
      sha256: String(row.sha256),
      width: row.width ? Number(row.width) : null,
      height: row.height ? Number(row.height) : null,
      kind: String(row.kind || 'diagram'),
      status: row.status === 'archived' ? ('archived' as const) : ('active' as const),
      archivedAt: row.archived_at ? new Date(row.archived_at).toISOString() : null,
      createdAt: new Date(row.created_at).toISOString(),
      keywords: Array.isArray(row.keywords) ? row.keywords : [],
      referenceCount: Number(row.reference_count || 0),
    }));

    return { assets, total };
  }

  async updateAsset(
    id: string,
    updates: { name?: string; keywords?: string[]; archived?: boolean }
  ): Promise<MediaAssetMetadata | null> {
    const existing = await pool.query(`SELECT id, status FROM media_assets WHERE id = $1`, [id]);
    if (existing.rows.length === 0) return null;

    const setClauses: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.name !== undefined) {
      setClauses.push(`name = $${idx++}`);
      values.push(updates.name);
    }

    if (updates.keywords !== undefined) {
      setClauses.push(`keywords = $${idx++}`);
      values.push(updates.keywords);
    }

    if (updates.archived !== undefined) {
      if (updates.archived) {
        setClauses.push(`status = 'archived'`);
        setClauses.push(`archived_at = NOW()`);
      } else {
        setClauses.push(`status = 'active'`);
        setClauses.push(`archived_at = NULL`);
      }
    }

    if (setClauses.length === 0) {
      return (await this.getAssetMetadata(id)) as MediaAssetMetadata;
    }

    values.push(id);
    const updateRes = await pool.query(
      `UPDATE media_assets
       SET ${setClauses.join(', ')}
       WHERE id = $${idx}
       RETURNING id, name, file_name, mime_type, file_size, sha256, width, height, kind, status, archived_at, created_at`,
      values
    );

    const row = updateRes.rows[0];
    return {
      id: String(row.id),
      name: String(row.name || row.file_name),
      fileName: String(row.file_name),
      mimeType: String(row.mime_type),
      fileSize: Number(row.file_size),
      sha256: String(row.sha256),
      width: row.width ? Number(row.width) : null,
      height: row.height ? Number(row.height) : null,
      kind: String(row.kind || 'diagram'),
      status: row.status === 'archived' ? 'archived' : 'active',
      archivedAt: row.archived_at ? new Date(row.archived_at).toISOString() : null,
      createdAt: new Date(row.created_at).toISOString(),
    };
  }

  async isAssetArchivedOrUnknown(id: string): Promise<{ exists: boolean; isArchived: boolean }> {
    const res = await pool.query(
      `SELECT id, status FROM media_assets WHERE id = $1`,
      [id]
    );
    if (res.rows.length === 0) {
      return { exists: false, isArchived: false };
    }
    return { exists: true, isArchived: res.rows[0].status === 'archived' };
  }

  private async getQuestionReferences(assetId: string): Promise<string[]> {
    const res = await pool.query(
      `SELECT id FROM question_bank
       WHERE question_type = 'diagram_labeling'
         AND (content::jsonb)->'diagram'->>'assetId' = $1`,
      [assetId]
    );
    return res.rows.map((r: any) => String(r.id));
  }
}

export const mediaStorage = new PostgresMediaStorage();
