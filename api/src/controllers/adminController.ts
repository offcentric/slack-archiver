import {Request, Response} from "../interfaces/controller";
import {requireAdmin} from "helpers/admin";
import {getPayload} from "helpers/payloadFields";
import {returnExceptionAsError, returnSuccess} from "helpers/response";
import {getWorkspaceNames} from "interfaces/user";
import {db} from '../db/knex';
import {backfillThumbnails} from "helpers/thumbnails";
import {initSlack} from "providers/slack";
import {Slackuser} from "models/slackuser";
import {Message} from "models/message";
import Exception from "models/exception";
import {status} from "helpers/status";

const assertWorkspace = (sessionWorkspaces, workspace: string) => {
    const allowed = getWorkspaceNames(sessionWorkspaces);
    if (!allowed.includes(workspace)) {
        throw new Exception('no_access_to_workspace', status.forbidden);
    }
};

export const sync = async (req: Request, res: Response) => {
    try {
        const session = await requireAdmin(req);
        const payload = getPayload(req);
        assertWorkspace(session.workspaces, payload.workspace);

        if (payload.action === 'users') {
            const slack = initSlack(payload.workspace);
            const resp = await slack.getUserlist();
            await (new Slackuser(req)).saveBatch(resp, payload.workspace);
            return returnSuccess(res, {
                workspace: payload.workspace,
                imported: resp.members?.length ?? 0,
            });
        }

        if (payload.action === 'messages') {
            if (!payload.channel) {
                throw new Exception('missing_required_fields : {channel}', status.bad);
            }
            const message = new Message(req);
            const latest = payload.latest ? Number(payload.latest) : undefined;
            const oldest = payload.oldest ? Number(payload.oldest) : undefined;
            const limit = payload.limit ? Number(payload.limit) : null;
            await message.getForChannel(payload.workspace, payload.channel, latest, oldest, limit, true);
            return returnSuccess(res, {
                workspace: payload.workspace,
                channel: payload.channel,
                imported: message.messageCount,
            });
        }

        throw new Exception('invalid_sync_action', status.bad);
    } catch (e) {
        return returnExceptionAsError(res, e);
    }
};

export const thumbnails = async (req: Request, res: Response) => {
    try {
        const session = await requireAdmin(req);
        const payload = getPayload(req);
        assertWorkspace(session.workspaces, payload.workspace);
        const summary = await backfillThumbnails(db, payload.workspace);
        return returnSuccess(res, {workspace: payload.workspace, ...summary});
    } catch (e) {
        return returnExceptionAsError(res, e);
    }
};

export const channels = async (req: Request, res: Response) => {
    try {
        const session = await requireAdmin(req);
        const payload = getPayload(req);
        assertWorkspace(session.workspaces, payload.workspace);
        const slack = initSlack(payload.workspace);
        const items = await slack.listArchiveChannels();
        return returnSuccess(res, {items});
    } catch (e) {
        return returnExceptionAsError(res, e);
    }
};
