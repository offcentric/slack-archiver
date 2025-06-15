import {GenericController} from '../controllers/_genericController';
import {Request, Response} from "../interfaces/controller";
import {File} from '../models/file';
import {checkAuth} from "helpers/auth";

export class FileController extends GenericController{
    tableName = 'message';
    constructor(req:Request){
        super(req);
        this.model = new File(req);
        this.model.orderBy = ['created_at', 'desc'];
        this.model.limit = 500;
    }

    async list(req:Request, res:Response) {
        try{
            const sessionData = await checkAuth(req);
            const payload = this.getPayload();
            this.handleWorkspaceFilter(res, payload, sessionData);
            this.handleDateFilter(res, payload, 'created_at');
            const  {orderBy, limit} = this.getOrderByAndLimit(req);
            const ret = await this.model._getCollection(payload, orderBy, limit, true);
            return this.returnSuccess(res, ret);
        }catch (e) {
            return this.returnExceptionAsError(res, e);
        }
    }
}

export const get = async(req:Request, res:Response) => {
    return await (new FileController(req)).get(req, res);
}

export const list = async(req:Request, res:Response) => {
    return await (new FileController(req)).list(req, res);
}