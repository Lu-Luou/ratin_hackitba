-- CreateEnum
CREATE TYPE "CreditRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "CreditDecisionOutcome" AS ENUM ('APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "credit_batch_runs" (
    "id" TEXT NOT NULL,
    "run_key" TEXT NOT NULL,
    "engine_version" TEXT NOT NULL,
    "status" "CreditRunStatus" NOT NULL DEFAULT 'RUNNING',
    "requested_by_id" UUID,
    "notes" TEXT,
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(6),
    "fields_checked" INTEGER NOT NULL DEFAULT 0,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "approved" INTEGER NOT NULL DEFAULT 0,
    "rejected" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "credit_batch_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_decisions" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "field_id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "prediction_snapshot_id" TEXT,
    "decision" "CreditDecisionOutcome" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "decision_reason" TEXT NOT NULL,
    "reason_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "feature_snapshot" JSONB NOT NULL,
    "source_snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "credit_batch_runs_run_key_key" ON "credit_batch_runs"("run_key");

-- CreateIndex
CREATE INDEX "credit_batch_runs_requested_by_id_idx" ON "credit_batch_runs"("requested_by_id");

-- CreateIndex
CREATE INDEX "credit_batch_runs_requested_at_idx" ON "credit_batch_runs"("requested_at");

-- CreateIndex
CREATE INDEX "credit_batch_runs_status_idx" ON "credit_batch_runs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "credit_decisions_run_id_field_id_key" ON "credit_decisions"("run_id", "field_id");

-- CreateIndex
CREATE INDEX "credit_decisions_field_id_idx" ON "credit_decisions"("field_id");

-- CreateIndex
CREATE INDEX "credit_decisions_user_id_idx" ON "credit_decisions"("user_id");

-- CreateIndex
CREATE INDEX "credit_decisions_decision_idx" ON "credit_decisions"("decision");

-- CreateIndex
CREATE INDEX "credit_decisions_created_at_idx" ON "credit_decisions"("created_at");

-- AddForeignKey
ALTER TABLE "credit_batch_runs"
ADD CONSTRAINT "credit_batch_runs_requested_by_id_fkey"
FOREIGN KEY ("requested_by_id") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_decisions"
ADD CONSTRAINT "credit_decisions_run_id_fkey"
FOREIGN KEY ("run_id") REFERENCES "credit_batch_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_decisions"
ADD CONSTRAINT "credit_decisions_field_id_fkey"
FOREIGN KEY ("field_id") REFERENCES "fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_decisions"
ADD CONSTRAINT "credit_decisions_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_decisions"
ADD CONSTRAINT "credit_decisions_prediction_snapshot_id_fkey"
FOREIGN KEY ("prediction_snapshot_id") REFERENCES "prediction_snapshots"("id") ON DELETE SET NULL ON UPDATE CASCADE;
