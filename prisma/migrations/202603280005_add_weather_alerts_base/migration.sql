-- CreateTable
CREATE TABLE "weather_alerts" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "relevance_score" INTEGER NOT NULL DEFAULT 0,
    "priority_score" INTEGER NOT NULL DEFAULT 0,
    "location" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "description" TEXT NOT NULL,
    "extracted_variables" JSONB NOT NULL,
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "weather_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alert_fields" (
    "alert_id" TEXT NOT NULL,
    "field_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "alert_fields_pkey" PRIMARY KEY ("alert_id", "field_id")
);

-- CreateIndex
CREATE INDEX "weather_alerts_user_id_idx" ON "weather_alerts"("user_id");

-- CreateIndex
CREATE INDEX "weather_alerts_issued_at_idx" ON "weather_alerts"("issued_at");

-- CreateIndex
CREATE INDEX "alert_fields_field_id_idx" ON "alert_fields"("field_id");

-- AddForeignKey
ALTER TABLE "weather_alerts" ADD CONSTRAINT "weather_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_fields" ADD CONSTRAINT "alert_fields_alert_id_fkey" FOREIGN KEY ("alert_id") REFERENCES "weather_alerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_fields" ADD CONSTRAINT "alert_fields_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "fields"("id") ON DELETE CASCADE ON UPDATE CASCADE;
