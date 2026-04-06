-- ============================================================
-- Migration: Add comment column to memberledger table
-- Run this once on your ocdadatabase before deploying the update
-- ============================================================

USE ocdadatabase;

-- Add comment column if it does not already exist
ALTER TABLE memberledger
  ADD COLUMN IF NOT EXISTS comment VARCHAR(500) NULL DEFAULT NULL;

-- Verify
DESCRIBE memberledger;
