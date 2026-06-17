-- SaleItem: persist sold unit (carton | piece) alongside piece-equivalent qty
ALTER TABLE "SaleItem" ADD COLUMN "qtyUnit" TEXT NOT NULL DEFAULT 'piece';
ALTER TABLE "SaleItem" ADD COLUMN "displayQty" DECIMAL(18,4);

UPDATE "SaleItem" SET "displayQty" = "qty" WHERE "displayQty" IS NULL;

UPDATE "SaleItem" AS si
SET
  "qtyUnit" = 'carton',
  "displayQty" = si."qty" / p."unitsPerCarton"
FROM "Sale" AS s, "Product" AS p
WHERE si."saleId" = s.id
  AND si."productId" = p.id
  AND s.type = 'wholesale'
  AND p."unitsPerCarton" > 1;

ALTER TABLE "SaleItem" ALTER COLUMN "displayQty" SET NOT NULL;

-- Return: same unit metadata
ALTER TABLE "Return" ADD COLUMN "qtyUnit" TEXT NOT NULL DEFAULT 'piece';
ALTER TABLE "Return" ADD COLUMN "displayQty" DECIMAL(18,4);

UPDATE "Return" SET "displayQty" = "qty" WHERE "displayQty" IS NULL;

ALTER TABLE "Return" ALTER COLUMN "displayQty" SET NOT NULL;
