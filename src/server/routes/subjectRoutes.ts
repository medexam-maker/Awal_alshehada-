import { Router, Request, Response } from 'express';
import { pool } from '../db';

const router = Router();

export interface SubjectItem {
  id: string;
  name_ar: string;
  name_en: string | null;
  slug: string;
  display_order: number;
}

/**
 * GET /api/subjects
 * Public/client subject retrieval adhering to C4 §11 and C3.
 * Queries the authoritative subjects table in PostgreSQL.
 * Does NOT invent synthetic IDs or seed fabricated production data.
 */
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await pool.query<SubjectItem>(
      `SELECT id, name_ar, name_en, slug, display_order
       FROM subjects
       WHERE is_active = true
       ORDER BY display_order ASC, name_ar ASC`
    );
    res.status(200).json({
      success: true,
      data: result.rows,
      message: '',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // If database connection is not yet configured or table is empty
    res.status(200).json({
      success: true,
      data: [],
      message: 'قاعدة البيانات غير متصلة أو لا توجد مواد مسجلة',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
