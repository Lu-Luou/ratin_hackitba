ALTER TABLE "fields"
ADD COLUMN "sort_order" INTEGER;

WITH ordered_fields AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC, id ASC) - 1 AS position
  FROM "fields"
)
UPDATE "fields" AS current_field
SET "sort_order" = ordered_fields.position
FROM ordered_fields
WHERE current_field.id = ordered_fields.id;

ALTER TABLE "fields"
ALTER COLUMN "sort_order" SET NOT NULL,
ALTER COLUMN "sort_order" SET DEFAULT 0;

CREATE INDEX "fields_user_id_sort_order_idx"
ON "fields" ("user_id", "sort_order");
