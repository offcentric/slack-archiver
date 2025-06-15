ALTER TABLE "user" RENAME TO slackuser;
ALTER TABLE slackuser DROP  COLUMN "email";

DROP TABLE IF EXISTS "user";
CREATE TABLE "user"
(
    "id"    serial       NOT NULL,
    "email" varchar(255) NOT NULL,
    "role"  integer      NOT NULL DEFAULT 0,
    "workspaces" character varying(255)[] COLLATE pg_catalog."default"
);

CREATE UNIQUE INDEX "user_email_key" ON "user" ("email");

ALTER TABLE IF EXISTS public.user
    OWNER to mark;
