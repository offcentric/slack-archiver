import {GenericController} from '../controllers/_genericController';
import {Request, Response} from "../interfaces/controller";
import {User} from '../models/user';

export class UserController extends GenericController{
    tableName = 'message';
    constructor(req:Request){
        super(req);
        this.model = new User(req);
        this.model.limit = 500;
    }
}

export const list = async(req:Request, res:Response) => {
    return await (new UserController(req)).list(req, res);
}