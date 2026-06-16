-- AlterTable
ALTER TABLE "Settings" ADD COLUMN "telegramBotToken" TEXT,
ADD COLUMN "telegramChatId" TEXT,
ADD COLUMN "telegramDailyTime" TEXT NOT NULL DEFAULT '21:00',
ADD COLUMN "telegramEnabled" BOOLEAN NOT NULL DEFAULT false;
