import {GenericController} from '../controllers/_genericController';
import {Request, Response} from "../interfaces/controller";
import {User} from '../models/user';
import {addToIpBlacklist, checkAuth, checkNoSession, createSession} from "helpers/auth";
import {getEnvConfig} from "helpers/config";
import {LocationHelper} from "helpers/location";
import {getDateTime} from "helpers/date";
import {UserLogin} from "models/user_login";
import {status, successMessage} from "helpers/status";

export class UserController extends GenericController{
    tableName = 'user';
    declare model:User;
    constructor(req:Request){
        super(req);
        this.model = new User(req);
        this.model.limit = 500;
    }

    async login(req:Request, res:Response){
        try{
            await checkNoSession(req, false);
            const payload = this.getPayload();
            try{
                const userData = await this.model.authenticate(payload.email, parseInt(payload.code));
                const sessionId = await createSession(req, userData);
                this.logLogin(req, res, payload, true);
                return this.returnSuccess(res, {...userData, session_id:sessionId});
            }catch(e){
                this.logLogin(req, res, payload, false, e.message)
                if(e.message === 'user_not_found' || e.message === 'invalid_code'){
                    const ipAddress = (new LocationHelper(req)).getIpAddress();
                    const fails = await (new UserLogin(req)).getLoginFails(ipAddress);
                    if(fails.length >= getEnvConfig('MAX_LOGIN_FAILS', 5)){
                        addToIpBlacklist(ipAddress);
                    }
                    return this.returnError(res, 'auth_fail', status.unauthorized);
                }
                return this.returnExceptionAsError(res, e);
            }
        }catch(e){
            // nested try/catch in case something goes wrong with writing to user_login table
            return this.returnExceptionAsError(res, e);
        }
    }

    async logout(req:Request, res:Response){
        try{
            await checkAuth(req);
            await this.model.logout(req);
            return this.returnSuccess(res, {...successMessage, ...{status:'logged_out'}});
        }catch(e){
            if(e.message !== 'no_session'){
                return this.handleError(res, e);
            }
            return this.returnSuccess(res, {...successMessage, ...{status:'logged_out'}});
        }
    }

    async sendLoginCode(req:Request, res:Response){
        try{
            await checkNoSession(req, false);
            const payload = this.getPayload();
            const ret = await this.model.sendLoginCode(payload.email);
            if(ret){
                return this.returnSuccess(res);
            }
            return this.returnError(res, 'failed_to_send_code');
        }catch(e){
            return this.handleError(res, e);
        }
    }

    async logLogin(req:Request, res:Response, payload:Record<string, any>, success:boolean, failReason?:string){
        try{
            const remote_address = (new LocationHelper(req)).getIpAddress();
            const {email, uid} = payload;
            await (new UserLogin(req))._addedit({email, uid, timestamp:getDateTime(), success, remote_address, fail_reason:failReason})
        }catch(e){
            return this.handleError(res, e);
        }
    }
}

export const list = async(req:Request, res:Response) => {
    return await (new UserController(req)).list(req, res);
}

export const sendlogincode = async(req:Request, res:Response) => {
    return await (new UserController(req)).sendLoginCode(req, res);
}

export const login = async(req:Request, res:Response) => {
    return await (new UserController(req)).login(req, res);
}

export const logout = async(req:Request, res:Response) => {
    return await (new UserController(req)).logout(req, res);
}