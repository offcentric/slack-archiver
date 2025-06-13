import {GenericController} from '../controllers/_genericController';
import {Request, Response} from "../interfaces/controller";
import {Message} from '../models/message';

export class MessageController extends GenericController{
    tableName = 'message';
    constructor(req:Request){
        super(req);
        this.model = new Message(req);
        this.model.limit = 500;
    }

    async list(req:Request, res:Response) {
        this.handleDateFilter(res, 'datetime');
        return await super.list(req, res);
    }

}
export const get = async(req:Request, res:Response) => {
    return await (new MessageController(req)).get(req, res);
}

export const list = async(req:Request, res:Response) => {
    return await (new MessageController(req)).list(req, res);
}