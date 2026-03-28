-- CreateTable
CREATE TABLE "fields" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT 'Sin definir',
    "hectares" INTEGER NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 50,
    "score_trend" INTEGER NOT NULL DEFAULT 0,
    "monthly_revenue_change" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "revenue_history" JSONB NOT NULL,
    "yield_history" JSONB NOT NULL,
    "repayment" JSONB NOT NULL,
    "risk" JSONB NOT NULL,
    "zone" TEXT NOT NULL DEFAULT 'Sin definir',
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "fields_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fields_user_id_idx" ON "fields"("user_id");

-- CreateIndex
CREATE INDEX "fields_created_at_idx" ON "fields"("created_at");

-- AddForeignKey
ALTER TABLE "fields" ADD CONSTRAINT "fields_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
