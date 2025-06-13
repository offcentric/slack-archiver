-- Table: public.user_logins

-- DROP TABLE IF EXISTS public.user_login;

CREATE TABLE IF NOT EXISTS public.user_login
(
    id serial NOT NULL,
    email character varying(255) DEFAULT NULL COLLATE pg_catalog."default",
    uid character varying(255) DEFAULT NULL COLLATE pg_catalog."default",
    "timestamp" timestamp NOT NULL,
    remote_address character varying(255) COLLATE pg_catalog."default",
    source character varying(32) DEFAULT NULL COLLATE pg_catalog."default",
    success boolean,
    fail_reason text COLLATE pg_catalog."default",
    CONSTRAINT user_login_pkey PRIMARY KEY (id)
)

    TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.user_login
    OWNER to mark;