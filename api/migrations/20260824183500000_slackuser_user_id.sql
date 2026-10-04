ALTER TABLE slackuser
    ADD COLUMN IF NOT EXISTS user_id integer NULL;

CREATE INDEX IF NOT EXISTS slackuser_user_id_idx
    ON slackuser (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS slackuser_user_id_workspace_idx
    ON slackuser (user_id, workspace)
    WHERE user_id IS NOT NULL;
