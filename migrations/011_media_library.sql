-- Migration 011: Media Library for Visual Mastery Lab (diagram_labeling)
-- Extends media_assets to store diagram images directly in PostgreSQL (BYTEA)
-- behind the MediaStorage abstraction, enforcing content-addressing and immutability.

ALTER TABLE media_assets
  ADD COLUMN IF NOT EXISTS data BYTEA,
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS keywords TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sha256 TEXT,
  ADD COLUMN IF NOT EXISTS width INT,
  ADD COLUMN IF NOT EXISTS height INT,
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'diagram',
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Unique index on sha256 for content-addressed immutability
CREATE UNIQUE INDEX IF NOT EXISTS idx_media_assets_sha256 ON media_assets(sha256) WHERE sha256 IS NOT NULL;

-- Index for searching and filtering
CREATE INDEX IF NOT EXISTS idx_media_assets_name ON media_assets(name);
CREATE INDEX IF NOT EXISTS idx_media_assets_status ON media_assets(status);
