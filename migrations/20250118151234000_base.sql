/*
 Navicat Premium Data Transfer

 Source Server         : Postgres
 Source Server Type    : PostgreSQL
 Source Server Version : 150006 (150006)
 Source Host           : localhost:5432
 Source Catalog        : slack_archive
 Source Schema         : public

 Target Server Type    : PostgreSQL
 Target Server Version : 150006 (150006)
 File Encoding         : 65001

 Date: 18/01/2025 15:09:03
*/


-- ----------------------------
-- Sequence structure for attachment_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."attachment_id_seq";
CREATE SEQUENCE "public"."attachment_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "public"."attachment_id_seq" OWNER TO "mark";

-- ----------------------------
-- Sequence structure for block_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."block_id_seq";
CREATE SEQUENCE "public"."block_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "public"."block_id_seq" OWNER TO "mark";

-- ----------------------------
-- Sequence structure for file_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."file_id_seq";
CREATE SEQUENCE "public"."file_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "public"."file_id_seq" OWNER TO "mark";

-- ----------------------------
-- Sequence structure for messages_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."messages_id_seq";
CREATE SEQUENCE "public"."messages_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "public"."messages_id_seq" OWNER TO "mark";

-- ----------------------------
-- Sequence structure for user_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "public"."user_id_seq";
CREATE SEQUENCE "public"."user_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 2147483647
START 1
CACHE 1;
ALTER SEQUENCE "public"."user_id_seq" OWNER TO "mark";

-- ----------------------------
-- Table structure for attachment
-- ----------------------------
DROP TABLE IF EXISTS "public"."attachment";
CREATE TABLE "public"."attachment" (
  "id" int4 NOT NULL DEFAULT nextval('attachment_id_seq'::regclass),
  "from_url" varchar(2048) COLLATE "pg_catalog"."default",
  "image_url" varchar(2048) COLLATE "pg_catalog"."default",
  "title" text COLLATE "pg_catalog"."default",
  "ts" varchar(255) COLLATE "pg_catalog"."default",
  "channel" varchar(255) COLLATE "pg_catalog"."default",
  "workspace" varchar(255) COLLATE "pg_catalog"."default",
  "text" text COLLATE "pg_catalog"."default",
  "pretext" text COLLATE "pg_catalog"."default",
  "block_ids" int4[]
)
;
ALTER TABLE "public"."attachment" OWNER TO "mark";

-- ----------------------------
-- Table structure for block
-- ----------------------------
DROP TABLE IF EXISTS "public"."block";
CREATE TABLE "public"."block" (
  "id" int4 NOT NULL DEFAULT nextval('block_id_seq'::regclass),
  "uid" varchar(255) COLLATE "pg_catalog"."default",
  "type" varchar(32) COLLATE "pg_catalog"."default",
  "image_url" varchar(512) COLLATE "pg_catalog"."default",
  "alt_text" varchar(255) COLLATE "pg_catalog"."default",
  "url" varchar(512) COLLATE "pg_catalog"."default",
  "parent_id" int4,
  "text" text COLLATE "pg_catalog"."default",
  "elements" json
)
;
ALTER TABLE "public"."block" OWNER TO "mark";

-- ----------------------------
-- Table structure for file
-- ----------------------------
DROP TABLE IF EXISTS "public"."file";
CREATE TABLE "public"."file" (
  "id" int4 NOT NULL DEFAULT nextval('file_id_seq'::regclass),
  "uid" varchar(255) COLLATE "pg_catalog"."default",
  "created_at" timestamp(6),
  "name" varchar(255) COLLATE "pg_catalog"."default",
  "title" varchar(255) COLLATE "pg_catalog"."default",
  "mimetype" varchar(255) COLLATE "pg_catalog"."default",
  "filetype" varchar(8) COLLATE "pg_catalog"."default",
  "user" varchar(32) COLLATE "pg_catalog"."default",
  "workspace" varchar(32) COLLATE "pg_catalog"."default",
  "url" varchar(255) COLLATE "pg_catalog"."default",
  "thumbnail" varchar(255) COLLATE "pg_catalog"."default",
  "savepath" varchar(512) COLLATE "pg_catalog"."default"
)
;
ALTER TABLE "public"."file" OWNER TO "mark";

-- ----------------------------
-- Table structure for message
-- ----------------------------
DROP TABLE IF EXISTS "public"."message";
CREATE TABLE "public"."message" (
  "id" int4 NOT NULL DEFAULT nextval('messages_id_seq'::regclass),
  "client_msg_id" varchar(255) COLLATE "pg_catalog"."default",
  "reply_to" varchar(255) COLLATE "pg_catalog"."default",
  "user" varchar(32) COLLATE "pg_catalog"."default",
  "ts" varchar(255) COLLATE "pg_catalog"."default",
  "datetime" timestamp(6),
  "workspace" varchar(32) COLLATE "pg_catalog"."default",
  "channel" varchar(32) COLLATE "pg_catalog"."default",
  "team" varchar(32) COLLATE "pg_catalog"."default",
  "type" varchar(32) COLLATE "pg_catalog"."default",
  "text" text COLLATE "pg_catalog"."default",
  "file_ids" int4[],
  "attachment_ids" int4[],
  "block_ids" int4[]
)
;
ALTER TABLE "public"."message" OWNER TO "mark";

-- ----------------------------
-- Table structure for user
-- ----------------------------
DROP TABLE IF EXISTS "public"."user";
CREATE TABLE "public"."user" (
  "id" int4 NOT NULL DEFAULT nextval('user_id_seq'::regclass),
  "uid" varchar(32) COLLATE "pg_catalog"."default",
  "workspace" varchar(32) COLLATE "pg_catalog"."default",
  "team_id" varchar(32) COLLATE "pg_catalog"."default",
  "name" varchar(255) COLLATE "pg_catalog"."default",
  "real_name" varchar(255) COLLATE "pg_catalog"."default",
  "is_bot" bool
)
;
ALTER TABLE "public"."user" OWNER TO "mark";

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."attachment_id_seq"
OWNED BY "public"."attachment"."id";
SELECT setval('"public"."attachment_id_seq"', 28795, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."block_id_seq"
OWNED BY "public"."block"."id";
SELECT setval('"public"."block_id_seq"', 206, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."file_id_seq"
OWNED BY "public"."file"."id";
SELECT setval('"public"."file_id_seq"', 14622, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."messages_id_seq"
OWNED BY "public"."message"."id";
SELECT setval('"public"."messages_id_seq"', 446545, true);

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "public"."user_id_seq"
OWNED BY "public"."user"."id";
SELECT setval('"public"."user_id_seq"', 224, true);

-- ----------------------------
-- Indexes structure for table attachment
-- ----------------------------
CREATE INDEX "idx_attachment_ts" ON "public"."attachment" USING btree (
  "ts" COLLATE "pg_catalog"."default" "pg_catalog"."text_ops" ASC NULLS LAST
);

-- ----------------------------
-- Primary Key structure for table attachment
-- ----------------------------
ALTER TABLE "public"."attachment" ADD CONSTRAINT "attachment_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Uniques structure for table block
-- ----------------------------
ALTER TABLE "public"."block" ADD CONSTRAINT "idx_block_uid" UNIQUE ("uid");

-- ----------------------------
-- Primary Key structure for table block
-- ----------------------------
ALTER TABLE "public"."block" ADD CONSTRAINT "block_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Uniques structure for table file
-- ----------------------------
ALTER TABLE "public"."file" ADD CONSTRAINT "idx_file_uid" UNIQUE ("uid");

-- ----------------------------
-- Primary Key structure for table file
-- ----------------------------
ALTER TABLE "public"."file" ADD CONSTRAINT "file_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Uniques structure for table message
-- ----------------------------
ALTER TABLE "public"."message" ADD CONSTRAINT "idx_message_ts" UNIQUE ("ts");

-- ----------------------------
-- Primary Key structure for table message
-- ----------------------------
ALTER TABLE "public"."message" ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");

-- ----------------------------
-- Uniques structure for table user
-- ----------------------------
ALTER TABLE "public"."user" ADD CONSTRAINT "idx_uid" UNIQUE ("uid");

-- ----------------------------
-- Primary Key structure for table user
-- ----------------------------
ALTER TABLE "public"."user" ADD CONSTRAINT "user_pkey" PRIMARY KEY ("id");
