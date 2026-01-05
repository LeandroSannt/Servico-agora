-- Step 2: Update existing records from old status to new status
-- STARTED -> IN_PROGRESS (orders that were started now are "in progress")
UPDATE "service_orders" SET status = 'IN_PROGRESS' WHERE status = 'STARTED';

-- WAITING -> PAUSED (orders that were waiting are now "paused")
UPDATE "service_orders" SET status = 'PAUSED' WHERE status = 'WAITING';

-- Step 3: Rename column waiting_reason to paused_reason
ALTER TABLE "service_orders" RENAME COLUMN "waiting_reason" TO "paused_reason";

-- Step 4: Update MessageTemplate triggerStatus values
UPDATE "message_templates" SET "trigger_status" = 'IN_PROGRESS' WHERE "trigger_status" = 'STARTED';
UPDATE "message_templates" SET "trigger_status" = 'PAUSED' WHERE "trigger_status" = 'WAITING';
