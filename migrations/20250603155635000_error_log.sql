DROP TABLE IF EXISTS public.error_log;

CREATE TABLE IF NOT EXISTS public.error_log
(
    id serial NOT NULL,
    message character varying(1024) COLLATE pg_catalog."default",
    code character varying(8) COLLATE pg_catalog."default",
    stacktrace text COLLATE pg_catalog."default",
    filepath character varying(256) COLLATE pg_catalog."default",
    filename character varying(256) COLLATE pg_catalog."default",
    line_number integer,
    method character varying(255) COLLATE pg_catalog."default",
    user_id integer,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT error_log_pkey PRIMARY KEY (id)
    )

    TABLESPACE pg_default;

ALTER TABLE "public"."error_log" OWNER TO "mark";