# Slack Archiver — LLM context

This file is the project map for anyone (human or model) working on this repo. Installation and Slack-app setup live in `README.md`. Use this file for architecture, data, and how to add features. The HTTP contract of record is `api/openapi.yaml` (OpenAPI 3.0) — use that spec when implementing a client.

Ignore `frontend/`. It is unfinished and will be replaced; do not extend or treat it as a reference for clients or UI.

## What it is

A long-term archive for Slack. A Slack bot in one or more workspaces listens to messages, file uploads, and channel activity, then writes them to Postgres via a webhook. CLI scripts backfill history. A REST API then serves that archive to authenticated users so they can browse and search only the workspaces they are allowed to see.

**In scope:** public and private channels. **Out of scope:** DMs (never archived).

The working product is the API package at `api/` (webhook ingest, REST, data layer, batch scripts).

## Architecture

```
Slack workspace(s)
  │  Events API  POST /webhook?workspace=<name>
  │  (also CLI backfill via @slack/web-api)
  ▼
Express API (api/)  ──►  PostgreSQL (slack_archive)
                    ──►  local disk files/{workspace}/{channel}/
```

- **Realtime ingest:** Slack Events API → `POST /webhook?workspace=<name>`.
- **Retroactive ingest:** `npm run saveMessages -- <workspace> <channel>` in `api/`.
- **Read path:** authenticated REST for a future custom UI (or any client).
- **Multi-workspace:** one API instance; each Slack team has its own env token block. App users are linked to Slack people via `slackuser.user_id`. Login returns those rows as `workspaces[]` (`workspace`, `uid`, `name`, `real_name`, …).

## Tech stack

Node (engines `^24`), TypeScript ESM, Express 4, Knex 3 + `pg`, `node-pg-migrate`, `express-session` + `connect-pg-simple` (`user_session` table), `@slack/web-api`, Mailgun (login codes), `node-cache`, PM2.

Path aliases resolve `src/*` (imports look like `helpers/auth`, `models/message`).

PostgreSQL. Knex `searchPath` is `['slack','public']`. Migrations: `api/migrations/*.sql`.

## Repo map

```
api/src/
  server.ts          Express bootstrap, middleware, listen
  routes/            Mounted at /
  controllers/       Handlers; most extend GenericController
  models/            Knex models; most extend GenericModel
  payload/           Per-endpoint request field schemas
  helpers/           auth, response, validate, search, config, …
  middleware/        IP blacklist, rate limit, api_log
  providers/         Slack Web API, Mailgun
  scripts/           CLI backfill / utilities
  db/knex.ts
```

## Data model

Relations are **int arrays, not FKs**. Joins happen in `GenericModel` via `child_relation` metadata.

```
message
  user            → slackuser.uid     (output key: slackuser)
  file_ids[]      → file.id           (output key: files)
  attachment_ids[]→ attachment.id     (output key: attachments)
  block_ids[]     → block.id          (output key: blocks)
  reply_to        → parent message.ts (thread replies; on GET with extended=['replies'] → replies[])

attachment.block_ids[] → block.id
```

### Tables

**`message`** — archive unit. Unique on Slack `ts` (string). `channel` is the **channel name**, not Slack ID. `datetime` is derived from `ts`. `text` is the only FTS field.

**`file`** — Slack files. `uid` unique. `url` is Slack `url_private`; `savepath` is the local download path. Binaries live under `FILES_DOWNLOAD_DIRECTORY` (default repo `files/`) as `{workspace}/{channel}/{title}--{id}.{ext}`. **There is no HTTP download/static endpoint yet** — API returns metadata only.

**`attachment`** — unfurls / link attachments (title, text, URLs).

**`block`** — subset of Block Kit; only `image` and `link` types are persisted.

**`slackuser`** — people in Slack (`uid`, `name`, `real_name`, `is_bot`, `workspace`, optional `user_id` → app `user.id`). Not app accounts. Login/getuserdata load every `slackuser` row with `user_id` equal to the session user.

**`user`** — app accounts: `email` unique, `role` int, `workspaces` `varchar[]` of workspace names. Login is email + 6-digit code (no passwords). API `workspaces` on login/getuserdata is **not** that column; it is the linked `slackuser` rows (`slackuser.user_id = user.id`).

Also: `user_session`, `user_login`, `api_log`, `error_log`. Code also reads `ip_blacklist` (no migration in repo).

## Ingest

### Webhook — `POST /webhook?workspace=<lowercase-name>`

Auth is Slack `body.token` vs `SLACK_VERIFICATION_TOKEN_<WORKSPACE>` (workspace name uppercased in env keys). URL verification: if `body.challenge` is present, echo it.

Handled events: `message` (including edits/deletes), `team_join`, channel/group created/deleted/renamed/archived/unarchived. Ignored channels: `SLACK_IGNORED_CHANNELS_<WORKSPACE>`. Errors can post to `SLACK_ALERTS_CHANNEL_<WORKSPACE>` (default `alerts`).

Message save: attachments → files (download + upsert) → blocks → upsert message on `ts`. Deletes remove the message and related child rows.

### CLI (`api/`, from that directory)

| Script | Purpose |
|--------|---------|
| `saveMessages -- <ws> <channel> [-latest ts] [-limit n]` | Backfill history + files |
| `listMessages` | Same fetch, no write |
| `saveUsers` / `listUsers` | Slack members → `slackuser` |
| `listChannels` | Name → ID map |
| `saveFile` / `getFile` / `fixAttachments` | File/attachment utilities |

## REST API

The HTTP contract of record is [`api/openapi.yaml`](api/openapi.yaml) (OpenAPI 3.0). Use that spec when implementing a client (request/response shapes, auth header, pagination, nested joins, known gaps). This section is a short summary.

Base URL is the Express port (`PORT`, template `6969`). JSON in/out. Prefer **POST**. List/get for messages and files also accept GET.

### Auth

1. `POST /user/sendlogincode` `{ email }` — if the email exists, Mailgun sends a 6-digit code cached 5 minutes (`auth_code_${email}`). Unknown emails still return success (no enumeration).
2. `POST /user/login` `{ email, code }` — returns the **user row plus** `session_id`. `workspaces` is an array of Slack identities (not bare names):

```json
{
  "id": 1,
  "email": "a@b.c",
  "role": 1,
  "name": "alice",
  "real_name": "Alice Example",
  "workspaces": [
    { "workspace": "acme", "uid": "U012ABCDEF", "name": "alice", "real_name": "Alice Example" }
  ],
  "session_id": "…"
}
```

Each identity is a `slackuser` row with `user_id` set to this app user (`SELECT * FROM slackuser WHERE user_id = user.id`). `uid` is stored on the session at login so a client can filter messages with `user`. `name` / `real_name` on the user object are copied from the first linked identity.
3. `POST /user/getuserdata` — Bearer token, no body. Same profile nested as `{ "userData": { … } }`.
4. `POST /user/getchannels` `{ workspace }` — Bearer token. Distinct `message.channel` values where `message.user` is the session Slack `uid` for that workspace. `403` if the workspace is not on the session ACL.
5. Every authenticated call must send `Authorization: Bearer <session_id>`. Do not send `session_id` in the JSON body. Cookies exist (`user_session`) but clients should not rely on them.
6. `POST /user/logout` — Bearer token, no body.

Workspace ACL: list endpoints call `handleWorkspaceFilter`. If `workspace` is omitted, results are limited to `session.workspaces[].workspace`. If set, it must match one of those names or the API returns 403 `no_access_to_workspace`.

`GET /health` and the webhook are unauthenticated. **`POST /message/search` currently has `checkAuth` commented out** — treat as a gap, not a feature; lock it down when touching search.

### Endpoints

| Method | Path | Auth | Body | Response |
|--------|------|------|-----------------------------|----------|
| GET | `/health` | no | — | `{ "status": "ok" }` |
| POST | `/user/sendlogincode` | no | `email` | success/error envelope |
| POST | `/user/login` | no | `email`, `code` | user row + `session_id`; `workspaces[]` are `{ workspace, uid, name, real_name }` |
| POST | `/user/getuserdata` | yes | — | `{ userData }` (same profile as login, no `session_id`) |
| POST | `/user/getchannels` | yes | `workspace` | `{ items }` — distinct channel names the user has posted in |
| POST | `/user/logout` | yes | — | logged-out envelope |
| POST/GET | `/message/list` | yes | `workspace?`, `channel?`, `user?`, `date_from?`, `date_to?`, `_orderby?`, `_limit?`, `_page?` | paginated `{ items, totalitems, totalpages, page }` |
| POST | `/message/get` | yes | `id` **or** `ts`; `simple?` | one message; nested `slackuser`, `files`, `attachments`, `blocks`, `replies` |
| POST | `/message/search` | **should be yes** | `q` required; `limit?`, `page?` | **array** of ranked rows (FTS on `message.text` only). `workspace`/`channel` are in the payload schema but **not applied** by `_search` |
| POST/GET | `/file/list` | yes | `workspace?` (controller, not schema), `user?`, `date_from?`, `date_to?`, pagination | paginated collection |
| POST | `/file/get` | yes | `id` | file row |
| POST | `/slackuser/list` | yes | `workspace?` | `{ items }` (no pagination flag) |
| POST | `/slackuser/get` | yes | index fields | slackuser row |
| POST | `/webhook` | Slack token | Events API body; `?workspace=` | challenge or save result |

Pagination (list): `_limit`, `_page` (offset `(page-1)*limit`), `_orderby`. Dates: `date_from` / `date_to` rewritten to `datetime` (messages) or `created_at` (files) with `>=` / `<=`.

List items include joined children when `show_in_list` is set on the relation (messages typically include `slackuser`, `files`, `attachments`, `blocks`).

### Response shapes

Success is often the **payload itself**, not wrapped. Errors:

```json
{ "status": "error", "success": false, "error": true, "message": "…", "detail": null, "stack": {} }
```

Common `message` strings: `auth_fail`, `no_access_to_workspace`, `missing_required_fields : {a,b}`, `invalid_data_for_fields : {…}`, `rate_limited`, `ip_blacklisted`.

`returnSuccess` uses `res.send`; health uses `res.json`. HTTP codes live in `api/src/helpers/status.ts`.

A future client should persist `session_id` + `workspaces` (including each `uid`), send `Authorization: Bearer <session_id>` on every authenticated call, and either pass a `workspace` name the user is allowed to see or omit it to query all of them. Load the channel sidebar with `POST /user/getchannels`. Filter that person's messages with `user` set to `workspaces[].uid` for the selected workspace. Serving archived binaries will need a new authenticated file endpoint (none exists).

## Conventions for new API work

1. Route in `api/src/routes/<name>Route.ts`, mount in `routes/routes.ts`.
2. Controller extends `GenericController`; set `this.model`. Override `list` if you need auth + workspace/date filters.
3. Model extends `GenericModel`; declare `metadata[]`, `indexField`, `listAll` if unfiltered list is allowed. Optional `prepareSavePayload`. Use `_get`, `_getCollection`, `_addedit`, `_search`.
4. Request schema in `api/src/payload/<name>.ts` and register in `helpers/payloadFields.ts` `AllFields`.
5. Throw `Exception(message, statusCode)` for controlled errors (`models/exception.ts`).
6. Upsert: `_addedit(..., 'edit')` is `INSERT … ON CONFLICT(index)`.

Env: copy `api/.env-template` → `api/.env`. Per-workspace keys use the workspace name **UPPERCASE**: `SLACK_BOT_TOKEN_ACME`, `SLACK_USER_TOKEN_ACME`, `SLACK_VERIFICATION_TOKEN_ACME`, `SLACK_IGNORED_CHANNELS_ACME`, `SLACK_ALERTS_CHANNEL_ACME`.

## Product constraints

- GDPR / access control: users must only see workspaces in `user.workspaces`.
- Do not add DM ingest.
- Login codes are in-process `node-cache` (lost on restart / not shared across instances).
- Rate limit (off by default): 5 req / 5s per UA+IP+path+body fingerprint.
- Every `res.send` is written to `api_log` (noisy for chatty polling; `/health` is the uptime target).
