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
}

export const list = async(req:Request, res:Response) => {
    return await (new MessageController(req)).list(req, res);
}