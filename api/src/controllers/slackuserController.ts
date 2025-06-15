import {GenericController} from '../controllers/_genericController';
import {Request, Response} from "../interfaces/controller";
import {Slackuser} from "models/slackuser";
import {checkAuth} from "helpers/auth";

export class SlackuserController extends GenericController{
    tableName = 'slackuser';
    constructor(req:Request){
        super(req);
        this.model = new Slackuser(req);
        this.model.limit = 500;
    }
    async list(req:Request, res:Response) {
        await checkAuth(req);
        return await super.list(req, res);
    }

}
export const get = async(req:Request, res:Response) => {
    return await (new SlackuserController(req)).get(req, res);
}

export const list = async(req:Request, res:Response) => {
    return await (new SlackuserController(req)).list(req, res);
}