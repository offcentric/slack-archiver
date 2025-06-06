import {GenericController} from '../controllers/_genericController';
import {Request, Response} from "../interfaces/controller";
import {File} from '../models/file';

export class FileController extends GenericController{
    tableName = 'message';
    constructor(req:Request){
        super(req);
        this.model = new File(req);
        this.model.orderBy = ['created_at', 'desc'];
        this.model.limit = 500;
    }
}

export const list = async(req:Request, res:Response) => {
    return await (new FileController(req)).list(req, res);
}