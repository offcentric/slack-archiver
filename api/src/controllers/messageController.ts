import {GenericController} from '../controllers/_genericController';
import {Request, Response} from "../interfaces/controller";
import {Message} from '../models/message';
import {checkAuth} from "helpers/auth";

export class MessageController extends GenericController{
    tableName = 'message';
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
            this.handleDateFilter(res, payload, 'datetime');
            console.log("PAYLOAD", payload);
            const  {orderBy, limit} = this.getOrderByAndLimit(req);
            const ret = await this.model._getCollection(payload, orderBy, limit, true);
            console.log("LIST MESSAGES", ret);
            return this.returnSuccess(res, ret);
        } catch (e) {
            return this.returnExceptionAsError(res, e);
        }
    }

    async get(req:Request, res:Response) {
        this.model.extended = ['replies'];
        return await super.get(req, res);
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