DROP TABLE IF EXISTS "user_session";

CREATE TABLE "user_session" ("sid" varchar NOT NULL COLLATE "default", "sess" json NOT NULL,"expire" timestamp(6) NOT NULL)
    WITH (OIDS=FALSE);

ALTER TABLE "user_session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
CREATE INDEX "IDX_session_expire" ON "user_session" ("expire");
