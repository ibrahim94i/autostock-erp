-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL DEFAULT 'شركتي',
    "companyPhone" TEXT,
    "companyAddress" TEXT,
    "companyLogo" TEXT,
    "taxNumber" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'IQD',
    "receiptSize" TEXT NOT NULL DEFAULT '80mm',
    "defaultTaxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "defaultReceiptFooter" TEXT NOT NULL DEFAULT 'شكراً لتعاملكم معنا',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);
