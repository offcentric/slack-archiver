import {checkAuth} from '../helpers/auth';
import {getDate} from "../helpers/date";
import {isProductionEnvironment} from '../helpers/env';
import { returnSuccess, returnError, returnExceptionAsError, handleError, redirect } from '../helpers/response';
import {getPayload} from '../helpers/payloadFields';
import {successMessage, errorMessage, status } from '../helpers/status';
import {Request, Response} from "../interfaces/controller";
import GenericModel from '../models/_genericModel';
import {SaveAction} from '../helpers/data';
import Exception from '../models/exception';
import {QueryPayload, SavePayload} from "../payload/_abstract";


export class GenericController{

    tableName = '';
    model:GenericModel = null;
    req = null;
    isAdm = false;
    payloadOverride:Record<string, any> = {};

    constructor(req:Request) {
        this.req = req;
        this.isAdm = req.app ? req.app.get('isAdm') : false;
    }

    getPayload(bodyOverride?:Record<string, any>) : SavePayload & QueryPayload {
        return getPayload(this.req, bodyOverride);
    }

    async get(req:Request, res:Response, doResponse = true, session = false) {
        let payload:any = {}
        try {
            await checkAuth(req);
            payload = this.getPayload();
            const isAdm = req.app.get('isAdm');
            if(session || isAdm){
                await checkAuth(req);
            }
            const detail = !req.body.simple;
            const ret = await this.model._get(payload, true, detail);
            return this.returnSuccess(res, ret, doResponse);
        } catch (e) {
            return this.returnExceptionAsError(res, e, doResponse);
        }
    }

    async getField(req:Request, res:Response, fieldName: string, raw?: boolean) {
        const payload = this.getPayload();
        if (!payload['code'] && !payload['slug']) {
            return this.returnError(res, 'index_value_missing');
        }

        try {
            const ret = await this.model.getField(fieldName, payload);
            return this.returnSuccess(res, raw || req.body.raw ? ret : {[fieldName]: ret});
        } catch (e) {
            return this.returnExceptionAsError(res, e);
        }
    }

    async list(req:Request, res:Response, doResponse = true, session = false, orderBy?, limit:number|Array<number|null> = [null,null]) {
        try {
            let payload;
            if(Object.keys(this.payloadOverride).length){
                payload  = {...this.getPayload(), ...this.payloadOverride};
            }else{
                payload = this.getPayload();
            }
            if (!Object.keys(payload).length && !this.model.listAll && isProductionEnvironment) {
                throw new Exception('missing_list_filter')
            }

            const  {orderBy, limit} = this.getOrderByAndLimit(req);
            const ret = await this.model._getCollection(payload, orderBy, limit, true);
            return this.returnSuccess(res, ret, doResponse);
        } catch (e) {
            return this.returnExceptionAsError(res, e, doResponse);
        }
    }

    getOrderByAndLimit(req:Request) {
        let orderBy, limit;
        if (req.body._orderby) {
            orderBy = req.body._orderby
        }
        if (!orderBy && this.model.indexField) {
            orderBy = [this.model.indexField, 'DESC'];
        }
        if (req.body._limit) {
            limit = req.body._limit
        }
        if (req.body._page) {
            if(typeof limit === 'number') {
                limit = [limit, (req.body._page-1) * limit];
            }
        }
        return {orderBy, limit};
    }

    async search(req:Request, res:Response) {
        try {
            // await checkAuth(req);
            const payload = this.getPayload();
            const ret = await this.model._search(payload.q, payload.limit, payload.page);
            return this.returnSuccess(res, ret);
        } catch (e) {
            return this.returnExceptionAsError(res, e);
        }
    }

    async addedit(req:Request, res:Response, action:SaveAction, doResponse = true) {
        try {
            await checkAuth(req);
            const payload = this.getPayload();
            const ret = await this.model._addedit(payload, action, null);
            return this.returnSuccess(res, ret, doResponse);
        } catch (e) {
            return this.returnExceptionAsError(res, e, doResponse);
        }
    }

    handleWorkspaceFilter(res, payload, sessionData){
        if(payload.workspace){
            if(!sessionData.workspaces.includes(payload.workspace)){
                throw new Exception('no_access_to_workspace', status.forbidden);
            }
            payload.workspace = [payload.workspace];
        }else{
            payload.workspace =  sessionData.workspaces;
        }
    }

    handleDateFilter(res, payload,dateField = 'created_at') {
        if(!payload.date_from && !payload.date_to){
            return;
        }
        payload[dateField] = [];
        if(payload.date_from){
            const dateFrom = new Date(payload.date_from);
            if(isNaN(dateFrom.getTime())) {
                throw new Exception('invalid_date_from', status.bad);
            }
            payload[dateField].push({'>=': getDate(dateFrom)});
            delete payload.date_from;
        }
        if(payload.date_to){
            const dateTo = new Date(payload.date_to);
            if(isNaN(dateTo.getTime())) {
                throw new Exception('invalid_date_to', status.bad);
            }
            payload[dateField].push({'<=': getDate(dateTo)});
            delete payload.date_to;
        }
    }

    async metadata(req:Request, res:Response) {
        try {
            this.model.isAdm = req.app.get('isAdm');
            return this.returnSuccess(res, {metadata: this.model.getMetadata()});
        } catch (e) {
            return this.returnExceptionAsError(res, e);
        }
    }

    returnSuccess(res:Response, successMsg: any = successMessage, doResponse = true, code: number = status.success) {
        return returnSuccess(res, successMsg, doResponse, code);
    }

    returnError(res:Response, message: string = errorMessage.message, code: number = status.error, doResponse = true) {
        return returnError(res, message, code, doResponse);
    }

    returnExceptionAsError(res:Response, e: Exception, doResponse = true) {
        return returnExceptionAsError(res, e, doResponse);
    }

    handleError(res:Response, e: Error|TypeError|string) {
        return handleError(res, e);
    }

    redirect(res:Response, url:string, code: number = status.redirect) {
        return redirect(res, url, code);
    }
}

export const metadata = async(req:Request, res:Response, model:GenericModel) => {
    const controller = new GenericController(req);
    controller.model = model;
    return await controller.metadata(req, res);
}