-- CreateTable
CREATE TABLE "CashRegister" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "openingBalance" DECIMAL(18,4) NOT NULL,
    "closingBalance" DECIMAL(18,4),
    "actualBalance" DECIMAL(18,4),
    "difference" DECIMAL(18,4),
    "status" TEXT NOT NULL DEFAULT 'open',
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashRegister_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashTransaction" (
    "id" TEXT NOT NULL,
    "registerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "description" TEXT,
    "reference" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CashRegister_date_key" ON "CashRegister"("date");

-- CreateIndex
CREATE UNIQUE INDEX "CashTransaction_reference_key" ON "CashTransaction"("reference");

-- AddForeignKey
ALTER TABLE "CashTransaction" ADD CONSTRAINT "CashTransaction_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "CashRegister"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
