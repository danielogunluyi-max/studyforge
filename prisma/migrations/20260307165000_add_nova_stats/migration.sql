-- Create Nova stats table for companion pet progression
CREATE TABLE "NovaStats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "happiness" INTEGER NOT NULL DEFAULT 50,
    "totalXP" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "lastActiveDate" TIMESTAMP(3),
    "notesGenerated" INTEGER NOT NULL DEFAULT 0,
    "flashcardsStudied" INTEGER NOT NULL DEFAULT 0,
    "audioConverted" INTEGER NOT NULL DEFAULT 0,
    "battlesWon" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NovaStats_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NovaStats_userId_key" ON "NovaStats"("userId");

ALTER TABLE "NovaStats"
ADD CONSTRAINT "NovaStats_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
