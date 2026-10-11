-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('DOCUMENTED', 'MULTI_SOURCE', 'ORAL', 'DISPUTED', 'UNVERIFIED');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'REVIEWER', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "NameLanguage" AS ENUM ('AR', 'HASSANIYA', 'BERBER', 'FR', 'EN', 'OTHER');

-- CreateEnum
CREATE TYPE "NameKind" AS ENUM ('CANONICAL_VARIANT', 'LOCAL', 'HISTORICAL', 'SPELLING_VARIANT', 'TRANSLATION', 'TRANSLITERATION', 'NICKNAME');

-- CreateEnum
CREATE TYPE "LocationPrecision" AS ENUM ('EXACT', 'APPROXIMATE', 'AREA', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "LocationMethod" AS ENUM ('FIELD_GPS', 'SATELLITE', 'OLD_MAP', 'SOURCE_DESCRIPTION', 'ORAL_DESCRIPTION', 'ESTIMATE');

-- CreateEnum
CREATE TYPE "BurialRelation" AS ENUM ('BURIED', 'BURIED_PROBABLE', 'BURIED_DISPUTED', 'REINTERRED', 'FOUNDER', 'ASSOCIATED');

-- CreateEnum
CREATE TYPE "PersonRelationType" AS ENUM ('FATHER_OF', 'MOTHER_OF', 'SPOUSE_OF', 'SIBLING_OF', 'OTHER_KIN', 'TEACHER_OF');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('BOOK', 'MANUSCRIPT', 'ARTICLE', 'THESIS', 'ARCHIVE_DOCUMENT', 'MAP', 'ORAL_INTERVIEW', 'FIELD_SURVEY', 'WEBSITE', 'OTHER');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('PHOTO', 'OLD_MAP', 'GEO_DOCUMENT', 'DOCUMENT', 'MANUSCRIPT', 'PAGE_SCAN', 'AUDIO', 'OTHER');

-- CreateEnum
CREATE TYPE "RevisionAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'RESTORE', 'IMPORT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'EDITOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "altNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "kind" TEXT,
    "description" TEXT,
    "parentId" TEXT,
    "searchText" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricalPeriod" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startYearHijri" INTEGER,
    "endYearHijri" INTEGER,
    "startYearGregorian" INTEGER,
    "endYearGregorian" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "searchText" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HistoricalPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Family" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "altNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT,
    "parentId" TEXT,
    "searchText" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Family_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cemetery" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "canonicalName" TEXT NOT NULL,
    "localName" TEXT,
    "nameMeaning" TEXT,
    "nameOrigin" TEXT,
    "regionId" TEXT,
    "locality" TEXT,
    "adminArea" TEXT,
    "foundingDateText" TEXT,
    "foundingYearHijri" INTEGER,
    "foundingYearGregorian" INTEGER,
    "earliestMentionText" TEXT,
    "earliestMentionYearHijri" INTEGER,
    "earliestMentionYearGregorian" INTEGER,
    "earliestMentionSourceNote" TEXT,
    "summary" TEXT,
    "history" TEXT,
    "communityRelations" TEXT,
    "narrativeDifferences" TEXT,
    "geographicDescription" TEXT,
    "fieldNotes" TEXT,
    "fieldStatus" JSONB NOT NULL DEFAULT '{}',
    "searchText" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "Cemetery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CemeteryName" (
    "id" TEXT NOT NULL,
    "cemeteryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "language" "NameLanguage" NOT NULL DEFAULT 'AR',
    "kind" "NameKind" NOT NULL DEFAULT 'SPELLING_VARIANT',
    "note" TEXT,
    "normalized" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CemeteryName_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "cemeteryId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "precision" "LocationPrecision" NOT NULL DEFAULT 'UNKNOWN',
    "radiusMeters" INTEGER,
    "method" "LocationMethod",
    "sourceNote" TEXT,
    "description" TEXT,
    "verification" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "recordedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "fullName" TEXT,
    "commonName" TEXT,
    "titles" TEXT,
    "nasab" TEXT,
    "gender" TEXT,
    "familyId" TEXT,
    "birthDateText" TEXT,
    "birthYearHijri" INTEGER,
    "birthYearGregorian" INTEGER,
    "birthPlace" TEXT,
    "deathDateText" TEXT,
    "deathYearHijri" INTEGER,
    "deathYearGregorian" INTEGER,
    "deathPlace" TEXT,
    "summary" TEXT,
    "biography" TEXT,
    "upbringing" TEXT,
    "travels" TEXT,
    "teachersText" TEXT,
    "studentsText" TEXT,
    "sciences" TEXT,
    "positions" TEXT,
    "legacy" TEXT,
    "researcherNotes" TEXT,
    "corrections" TEXT,
    "isContemporary" BOOLEAN NOT NULL DEFAULT false,
    "publicationConsent" TEXT,
    "fieldStatus" JSONB NOT NULL DEFAULT '{}',
    "searchText" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonName" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "language" "NameLanguage" NOT NULL DEFAULT 'AR',
    "kind" "NameKind" NOT NULL DEFAULT 'SPELLING_VARIANT',
    "note" TEXT,
    "normalized" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonName_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Burial" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "cemeteryId" TEXT NOT NULL,
    "relation" "BurialRelation" NOT NULL DEFAULT 'BURIED',
    "verification" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "burialDateText" TEXT,
    "graveDescription" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Burial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonRelation" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "type" "PersonRelationType" NOT NULL,
    "kinLabel" TEXT,
    "verification" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonRelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Work" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT,
    "form" TEXT,
    "state" TEXT,
    "holdingNote" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Work_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricalEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dateText" TEXT,
    "yearHijri" INTEGER,
    "yearGregorian" INTEGER,
    "description" TEXT,
    "verification" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "cemeteryId" TEXT,
    "personId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HistoricalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OralAccount" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "narrator" TEXT,
    "narratorPublic" BOOLEAN NOT NULL DEFAULT false,
    "consentNote" TEXT,
    "recordedBy" TEXT,
    "recordedAt" TEXT,
    "place" TEXT,
    "content" TEXT NOT NULL,
    "verification" "VerificationStatus" NOT NULL DEFAULT 'ORAL',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "cemeteryId" TEXT,
    "personId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OralAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "type" "SourceType" NOT NULL DEFAULT 'BOOK',
    "title" TEXT NOT NULL,
    "author" TEXT,
    "editor" TEXT,
    "publisher" TEXT,
    "publicationPlace" TEXT,
    "year" TEXT,
    "edition" TEXT,
    "volumes" TEXT,
    "url" TEXT,
    "description" TEXT,
    "reliabilityNotes" TEXT,
    "rightsNotes" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "searchText" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Citation" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "volume" TEXT,
    "pages" TEXT,
    "quote" TEXT,
    "summary" TEXT,
    "field" TEXT NOT NULL DEFAULT 'general',
    "note" TEXT,
    "pageImageId" TEXT,
    "cemeteryId" TEXT,
    "personId" TEXT,
    "burialId" TEXT,
    "relationId" TEXT,
    "locationId" TEXT,
    "workId" TEXT,
    "eventId" TEXT,
    "oralAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Citation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaFile" (
    "id" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL DEFAULT 'PHOTO',
    "originalName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "title" TEXT,
    "caption" TEXT,
    "credit" TEXT,
    "rights" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "uploadedById" TEXT,
    "cemeteryId" TEXT,
    "personId" TEXT,
    "sourceId" TEXT,
    "oralAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Revision" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "RevisionAction" NOT NULL,
    "summary" TEXT,
    "changes" JSONB,
    "snapshot" JSONB,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Revision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "_HistoricalPeriodToPerson" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_HistoricalPeriodToPerson_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CemeteryToHistoricalPeriod" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CemeteryToHistoricalPeriod_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Region_name_parentId_key" ON "Region"("name", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "HistoricalPeriod_name_key" ON "HistoricalPeriod"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Family_name_key" ON "Family"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Cemetery_slug_key" ON "Cemetery"("slug");

-- CreateIndex
CREATE INDEX "Cemetery_status_idx" ON "Cemetery"("status");

-- CreateIndex
CREATE INDEX "Cemetery_regionId_idx" ON "Cemetery"("regionId");

-- CreateIndex
CREATE INDEX "CemeteryName_cemeteryId_idx" ON "CemeteryName"("cemeteryId");

-- CreateIndex
CREATE INDEX "Location_cemeteryId_idx" ON "Location"("cemeteryId");

-- CreateIndex
CREATE UNIQUE INDEX "Person_slug_key" ON "Person"("slug");

-- CreateIndex
CREATE INDEX "Person_status_idx" ON "Person"("status");

-- CreateIndex
CREATE INDEX "Person_familyId_idx" ON "Person"("familyId");

-- CreateIndex
CREATE INDEX "PersonName_personId_idx" ON "PersonName"("personId");

-- CreateIndex
CREATE INDEX "Burial_cemeteryId_idx" ON "Burial"("cemeteryId");

-- CreateIndex
CREATE UNIQUE INDEX "Burial_personId_cemeteryId_relation_key" ON "Burial"("personId", "cemeteryId", "relation");

-- CreateIndex
CREATE INDEX "PersonRelation_toId_idx" ON "PersonRelation"("toId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonRelation_fromId_toId_type_key" ON "PersonRelation"("fromId", "toId", "type");

-- CreateIndex
CREATE INDEX "Work_personId_idx" ON "Work"("personId");

-- CreateIndex
CREATE INDEX "HistoricalEvent_cemeteryId_idx" ON "HistoricalEvent"("cemeteryId");

-- CreateIndex
CREATE INDEX "HistoricalEvent_personId_idx" ON "HistoricalEvent"("personId");

-- CreateIndex
CREATE INDEX "Citation_sourceId_idx" ON "Citation"("sourceId");

-- CreateIndex
CREATE INDEX "Citation_cemeteryId_idx" ON "Citation"("cemeteryId");

-- CreateIndex
CREATE INDEX "Citation_personId_idx" ON "Citation"("personId");

-- CreateIndex
CREATE INDEX "Citation_burialId_idx" ON "Citation"("burialId");

-- CreateIndex
CREATE INDEX "Citation_relationId_idx" ON "Citation"("relationId");

-- CreateIndex
CREATE INDEX "Citation_locationId_idx" ON "Citation"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaFile_storedName_key" ON "MediaFile"("storedName");

-- CreateIndex
CREATE INDEX "MediaFile_cemeteryId_idx" ON "MediaFile"("cemeteryId");

-- CreateIndex
CREATE INDEX "MediaFile_personId_idx" ON "MediaFile"("personId");

-- CreateIndex
CREATE INDEX "MediaFile_sha256_idx" ON "MediaFile"("sha256");

-- CreateIndex
CREATE INDEX "Revision_entityType_entityId_idx" ON "Revision"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "Revision_createdAt_idx" ON "Revision"("createdAt");

-- CreateIndex
CREATE INDEX "_HistoricalPeriodToPerson_B_index" ON "_HistoricalPeriodToPerson"("B");

-- CreateIndex
CREATE INDEX "_CemeteryToHistoricalPeriod_B_index" ON "_CemeteryToHistoricalPeriod"("B");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Region" ADD CONSTRAINT "Region_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Family" ADD CONSTRAINT "Family_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Family"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cemetery" ADD CONSTRAINT "Cemetery_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CemeteryName" ADD CONSTRAINT "CemeteryName_cemeteryId_fkey" FOREIGN KEY ("cemeteryId") REFERENCES "Cemetery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_cemeteryId_fkey" FOREIGN KEY ("cemeteryId") REFERENCES "Cemetery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonName" ADD CONSTRAINT "PersonName_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Burial" ADD CONSTRAINT "Burial_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Burial" ADD CONSTRAINT "Burial_cemeteryId_fkey" FOREIGN KEY ("cemeteryId") REFERENCES "Cemetery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonRelation" ADD CONSTRAINT "PersonRelation_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonRelation" ADD CONSTRAINT "PersonRelation_toId_fkey" FOREIGN KEY ("toId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Work" ADD CONSTRAINT "Work_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricalEvent" ADD CONSTRAINT "HistoricalEvent_cemeteryId_fkey" FOREIGN KEY ("cemeteryId") REFERENCES "Cemetery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricalEvent" ADD CONSTRAINT "HistoricalEvent_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OralAccount" ADD CONSTRAINT "OralAccount_cemeteryId_fkey" FOREIGN KEY ("cemeteryId") REFERENCES "Cemetery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OralAccount" ADD CONSTRAINT "OralAccount_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_pageImageId_fkey" FOREIGN KEY ("pageImageId") REFERENCES "MediaFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_cemeteryId_fkey" FOREIGN KEY ("cemeteryId") REFERENCES "Cemetery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_burialId_fkey" FOREIGN KEY ("burialId") REFERENCES "Burial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_relationId_fkey" FOREIGN KEY ("relationId") REFERENCES "PersonRelation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "HistoricalEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_oralAccountId_fkey" FOREIGN KEY ("oralAccountId") REFERENCES "OralAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaFile" ADD CONSTRAINT "MediaFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaFile" ADD CONSTRAINT "MediaFile_cemeteryId_fkey" FOREIGN KEY ("cemeteryId") REFERENCES "Cemetery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaFile" ADD CONSTRAINT "MediaFile_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaFile" ADD CONSTRAINT "MediaFile_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaFile" ADD CONSTRAINT "MediaFile_oralAccountId_fkey" FOREIGN KEY ("oralAccountId") REFERENCES "OralAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Revision" ADD CONSTRAINT "Revision_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HistoricalPeriodToPerson" ADD CONSTRAINT "_HistoricalPeriodToPerson_A_fkey" FOREIGN KEY ("A") REFERENCES "HistoricalPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_HistoricalPeriodToPerson" ADD CONSTRAINT "_HistoricalPeriodToPerson_B_fkey" FOREIGN KEY ("B") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CemeteryToHistoricalPeriod" ADD CONSTRAINT "_CemeteryToHistoricalPeriod_A_fkey" FOREIGN KEY ("A") REFERENCES "Cemetery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CemeteryToHistoricalPeriod" ADD CONSTRAINT "_CemeteryToHistoricalPeriod_B_fkey" FOREIGN KEY ("B") REFERENCES "HistoricalPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Integrity: a citation supports exactly one record
-- ---------------------------------------------------------------------------
ALTER TABLE "Citation" ADD CONSTRAINT "Citation_exactly_one_target" CHECK (
  num_nonnulls("cemeteryId", "personId", "burialId", "relationId", "locationId", "workId", "eventId", "oralAccountId") = 1
);

-- A person cannot be related to themselves
ALTER TABLE "PersonRelation" ADD CONSTRAINT "PersonRelation_not_self" CHECK ("fromId" <> "toId");

-- Coordinates: both or neither, and within valid ranges
ALTER TABLE "Location" ADD CONSTRAINT "Location_coords_pair" CHECK (("latitude" IS NULL) = ("longitude" IS NULL));
ALTER TABLE "Location" ADD CONSTRAINT "Location_lat_range" CHECK ("latitude" IS NULL OR "latitude" BETWEEN -90 AND 90);
ALTER TABLE "Location" ADD CONSTRAINT "Location_lng_range" CHECK ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180);
ALTER TABLE "Location" ADD CONSTRAINT "Location_radius_positive" CHECK ("radiusMeters" IS NULL OR "radiusMeters" > 0);

-- At most one primary location per cemetery
CREATE UNIQUE INDEX "Location_one_primary_per_cemetery" ON "Location" ("cemeteryId") WHERE "isPrimary";

-- ---------------------------------------------------------------------------
-- Arabic-normalized fuzzy search (trigram)
-- ---------------------------------------------------------------------------
CREATE INDEX "Cemetery_searchText_trgm" ON "Cemetery" USING gin ("searchText" gin_trgm_ops);
CREATE INDEX "Person_searchText_trgm" ON "Person" USING gin ("searchText" gin_trgm_ops);
CREATE INDEX "Source_searchText_trgm" ON "Source" USING gin ("searchText" gin_trgm_ops);
CREATE INDEX "Region_searchText_trgm" ON "Region" USING gin ("searchText" gin_trgm_ops);
CREATE INDEX "Family_searchText_trgm" ON "Family" USING gin ("searchText" gin_trgm_ops);
CREATE INDEX "HistoricalPeriod_searchText_trgm" ON "HistoricalPeriod" USING gin ("searchText" gin_trgm_ops);
