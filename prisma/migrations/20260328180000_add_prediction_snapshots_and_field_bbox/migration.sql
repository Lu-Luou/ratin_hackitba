-- AlterTable
ALTER TABLE "fields"
ADD COLUMN "bbox_min_lon" DOUBLE PRECISION,
ADD COLUMN "bbox_min_lat" DOUBLE PRECISION,
ADD COLUMN "bbox_max_lon" DOUBLE PRECISION,
ADD COLUMN "bbox_max_lat" DOUBLE PRECISION,
ADD COLUMN "default_cost_per_ha_usd" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "prediction_snapshots" (
    "id" TEXT NOT NULL,
    "field_id" TEXT NOT NULL,
    "start_date" TEXT NOT NULL,
    "end_date" TEXT NOT NULL,
    "predicted_yield_ton_ha" DOUBLE PRECISION NOT NULL,
    "spot_price_usd_per_ton" DOUBLE PRECISION NOT NULL,
    "futures_contracts" JSONB NOT NULL,
    "cost_per_ha_usd" DOUBLE PRECISION NOT NULL,
    "gross_spot_usd" DOUBLE PRECISION NOT NULL,
    "net_spot_usd" DOUBLE PRECISION NOT NULL,
    "gross_futures_usd" JSONB NOT NULL,
    "net_futures_usd" JSONB NOT NULL,
    "warning" TEXT,
    "source" TEXT NOT NULL DEFAULT 'yahoo',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prediction_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "prediction_snapshots_field_id_created_at_idx"
ON "prediction_snapshots"("field_id", "created_at");

-- AddForeignKey
ALTER TABLE "prediction_snapshots"
ADD CONSTRAINT "prediction_snapshots_field_id_fkey"
FOREIGN KEY ("field_id") REFERENCES "fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;
