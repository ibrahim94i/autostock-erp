-- Drop unique constraint on date to allow multiple cash registers per day
DROP INDEX IF EXISTS "CashRegister_date_key";

-- Index for date lookups
CREATE INDEX "CashRegister_date_idx" ON "CashRegister"("date");
