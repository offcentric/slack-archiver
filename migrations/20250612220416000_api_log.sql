DROP TABLE IF EXISTS public.api_log;

CREATE TABLE IF NOT EXISTS public.api_log
(
    id serial NOT NULL,
    path character varying(255) COLLATE pg_catalog."default" NOT NULL,
    method character varying(32) COLLATE pg_catalog."default" NOT NULL,
    payload text COLLATE pg_catalog."default",
    response_code integer NOT NULL,
    response_data text COLLATE pg_catalog."default",
    remote_ip character varying(255) COLLATE pg_catalog."default" NOT NULL,
    headers text COLLATE pg_catalog."default" NOT NULL,
    created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    request_at timestamp without time zone NOT NULL,
    response_at timestamp without time zone NOT NULL,
    response_time integer NOT NULL,
    CONSTRAINT api_log_pkey PRIMARY KEY (id)
)

    TABLESPACE pg_default;

ALTER TABLE IF EXISTS public.api_log
    OWNER to chdb;

CREATE INDEX IF NOT EXISTS path
    ON public.api_log USING btree
        (path COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;
