-- Migration: Update OrderStatus enum values and rename waiting_reason column
-- Date: 2026-01-05
-- Description:
--   1. Add new status values: RECEIVED, IN_PROGRESS, PAUSED
--   2. Remove old status values: STARTED, WAITING
--   3. Rename column waiting_reason to paused_reason
--   4. Update existing data to new status values

-- Step 1: Add new enum values to OrderStatus
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'RECEIVED';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'IN_PROGRESS';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PAUSED';

-- Step 2: Update existing records from old status to new status
-- STARTED -> IN_PROGRESS (orders that were started now are "in progress")
UPDATE "service_orders" SET status = 'IN_PROGRESS' WHERE status = 'STARTED';

-- WAITING -> PAUSED (orders that were waiting are now "paused")
UPDATE "service_orders" SET status = 'PAUSED' WHERE status = 'WAITING';

-- Step 3: Rename column waiting_reason to paused_reason
ALTER TABLE "service_orders" RENAME COLUMN "waiting_reason" TO "paused_reason";

-- Step 4: Update MessageTemplate triggerStatus values
UPDATE "message_templates" SET "triggerStatus" = 'IN_PROGRESS' WHERE "triggerStatus" = 'STARTED';
UPDATE "message_templates" SET "triggerStatus" = 'PAUSED' WHERE "triggerStatus" = 'WAITING';

-- Note: We cannot remove old enum values in PostgreSQL, but they won't be used anymore.
-- The application code will only use the new values: RECEIVED, IN_PROGRESS, PAUSED, FINISHED, PAID
