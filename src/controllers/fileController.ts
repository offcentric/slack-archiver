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

    async list(req:Request, res:Response) {
        this.handleDateFilter(res, 'created_at');
        return await super.list(req, res);
    }
}

export const get = async(req:Request, res:Response) => {
    return await (new FileController(req)).get(req, res);
}

export const list = async(req:Request, res:Response) => {
    return await (new FileController(req)).list(req, res);
}