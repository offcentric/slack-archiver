import {GenericController} from '../controllers/_genericController';
import {Request, Response} from "../interfaces/controller";
import {Message} from '../models/message';
import {checkAuth} from "helpers/auth";
import {getWorkspaceNames} from "interfaces/user";
import {MESSAGE_SORT_COLUMNS, sanitizeOrderBy, textIlikeFilter} from "helpers/archiveQuery";
import Exception from "models/exception";
import {status} from "helpers/status";

export class MessageController extends GenericController{
    tableName = 'message';
    declare model: Message;
    constructor(req:Request){
        super(req);
        this.model = new Message(req);
        this.model.limit = 500;
    }

    async list(req:Request, res:Response) {
        try {
            const sessionData = await checkAuth(req);
            const payload = this.getPayload();
            this.handleWorkspaceFilter(res, payload, sessionData);
            if(payload.channel === ''){
                delete payload.channel;
            }
            if (typeof payload.text === 'string' && payload.text) {
                payload.text = textIlikeFilter(payload.text);
            } else {
                delete payload.text;
            }
            if (payload.user === '') {
                delete payload.user;
            }
            this.handleDateFilter(res, payload, 'datetime');
            const {orderBy, limit} = this.getOrderByAndLimit(req);
            const safeOrder = sanitizeOrderBy(orderBy, MESSAGE_SORT_COLUMNS, ['ts', 'desc']);
            const ret = await this.model._getCollection(payload, safeOrder, limit, true);
            await this.model.attachParents(ret.items, payload.workspace);
            return this.returnSuccess(res, ret);
        } catch (e) {
            return this.returnExceptionAsError(res, e);
        }
    }

    async get(req:Request, res:Response) {
        try {
            const sessionData = await checkAuth(req);
            this.model.extended = ['replies'];
            const payload = this.getPayload();
            const ret = await this.model._get(payload, true, true);
            const allowed = getWorkspaceNames(sessionData.workspaces);
            if (ret?.workspace && !allowed.includes(ret.workspace)) {
                throw new Exception('no_access_to_workspace', status.forbidden);
            }
            return this.returnSuccess(res, ret);
        } catch (e) {
            return this.returnExceptionAsError(res, e);
        }
    }

    async listThreaded(req:Request, res:Response) {
        try {
            const sessionData = await checkAuth(req);
            const payload = this.getPayload();
            this.handleWorkspaceFilter(res, payload, sessionData);
            if(payload.channel === ''){
                delete payload.channel;
            }
            if (typeof payload.text === 'string' && payload.text) {
                payload.text = textIlikeFilter(payload.text);
            } else {
                delete payload.text;
            }
            this.handleDateFilter(res, payload, 'datetime');
            payload.reply_to = null;
            const {orderBy, limit} = this.getOrderByAndLimit(req);
            const safeOrder = sanitizeOrderBy(orderBy, MESSAGE_SORT_COLUMNS, ['ts', 'desc']);
            const ret = await this.model._getCollection(payload, safeOrder, limit, true);
            await this.model.attachReplies(ret.items, {
                workspace: payload.workspace,
                channel: payload.channel,
            });
            return this.returnSuccess(res, ret);
        } catch (e) {
            return this.returnExceptionAsError(res, e);
        }
    }

    async channels(req:Request, res:Response) {
        try {
            const sessionData = await checkAuth(req);
            const payload = this.getPayload();
            const allowed = getWorkspaceNames(sessionData.workspaces);
            if (!allowed.includes(payload.workspace)) {
                throw new Exception('no_access_to_workspace', status.forbidden);
            }
            const items = await this.model.getChannelsForWorkspace(payload.workspace);
            return this.returnSuccess(res, {items});
        } catch (e) {
            return this.returnExceptionAsError(res, e);
        }
    }

    async search(req:Request, res:Response) {
        try {
            const sessionData = await checkAuth(req);
            const payload = this.getPayload();
            let workspaces = getWorkspaceNames(sessionData.workspaces);
            if (payload.workspace) {
                if (!workspaces.includes(payload.workspace)) {
                    throw new Exception('no_access_to_workspace', status.forbidden);
                }
                workspaces = [payload.workspace];
            }
            const ret = await this.model._search(payload.q, payload.limit, payload.page, {
                workspace: workspaces,
                channel: payload.channel || undefined,
            });
            return this.returnSuccess(res, ret);
        } catch (e) {
            return this.returnExceptionAsError(res, e);
        }
    }
}

export const get = async(req:Request, res:Response) => {
    return await (new MessageController(req)).get(req, res);
}

export const list = async(req:Request, res:Response) => {
    return await (new MessageController(req)).list(req, res);
}

export const search = async(req:Request, res:Response) => {
    return await (new MessageController(req)).search(req, res);
}

export const listthreaded = async(req:Request, res:Response) => {
    return await (new MessageController(req)).listThreaded(req, res);
}

export const channels = async(req:Request, res:Response) => {
    return await (new MessageController(req)).channels(req, res);
}
