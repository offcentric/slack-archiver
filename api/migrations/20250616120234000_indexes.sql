CREATE INDEX IF NOT EXISTS file_uid_idx
    ON public."file" USING btree
        (uid COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS block_uid_idx
    ON public."block" USING btree
        (uid COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS message_ts_idx
    ON public."message" USING btree
        (ts COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;