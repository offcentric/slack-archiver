import jwt from 'jsonwebtoken';
import { getEnvConfig } from '../helpers/config';
import {isAdminPath} from '../helpers/path';
import { UserRoles } from '../helpers/user';
import {status} from '../helpers/status';
import Exception from '../models/exception';
import ExceptionMuted from "../models/exceptionmuted";
import {addedit} from "helpers/data";

export interface SessionStore{
    session_id:string,
    ip_address: string,
    role: number,
    email: string,
    uuid: string,
    token: string,
    user_id: number
    cookie?:Record<string, any>
}

export const getSessionStore = async (req):Promise<SessionStore> => {
    try{
        const sessionId = getSessionIdFromRequest(req);
        return await new Promise((resolve, reject) => {
            req.sessionStore.get(sessionId, (err, session:SessionStore) => {
                if(err){
                    reject(err);
                }else if(!session || typeof session === 'undefined'){
                    reject('no_session');
                }else{
                    delete(session.cookie);
                    resolve(session);
                }
            })
        }).then((data:SessionStore) => {
            // console.log("SESSION STORE", data);
            return data;
        }).catch((err) => {
            throw new ExceptionMuted(err, status.unauthorized);
        })
    }catch(e){
        throw new ExceptionMuted(e.message, status.unauthorized);
    }
}

export const getJwtData = (req):SessionStore  => {
    const authHeader = req.headers['authorization'];
    if(!authHeader || !authHeader.startsWith('Bearer ')){
        throw new Exception('jwt_missing', status.unauthorized);
    }
    const token = authHeader.split('Bearer ')[1];
    try {
        return jwt.verify(token, getEnvConfig('JWT_SECRET'));
    } catch (err) {
        throw new Exception('invalid_or_expired_token', status.unauthorized);
    }
}

const getSessionId = async(req) => {
    try{
        const session = await getSessionStore(req);
        return session.session_id;
    }catch(e){
        if(e.code === status.unauthorized){
            const sessionId = req.session.session_id;
            if(sessionId){
                return sessionId;
            }
            throw e;
        }
    }
}

export const clearSessionStore = async(req):Promise<boolean> => {
    return await new Promise(async (resolve, reject) => {
        const sessionId = await getSessionId(req);
        req.sessionStore.destroy(sessionId, (err)=> {
            if(err){
                reject(err);
            }else{
                resolve(true);
            }
        })
    }).then((ret:boolean) => {
        return ret;
    }).catch((err) => {
        throw new Exception(err);
    });
}

export const checkAuth = async (req, minRole = UserRoles.ROLE_USER, allowKeyOnProd = false):Promise<boolean> => {

    if(req.headers.host.indexOf('localhost') === 0 && req.body.ignore_session){
        return true;
    }

    if(req.headers['sec-websocket-protocol']){
        const protocols = req.headers['sec-websocket-protocol'].split(', ');
        if(protocols[0] === 'secure' && protocols[1] === 'token:'+getEnvConfig('API_KEY')){
            return true;
        }
    }

    // TODO: remove basic auth with static API key once login token is supported on the app
    if(getEnvConfig('ENVIRONMENT') !== 'production' || allowKeyOnProd){
        if(req.headers['authorization'] === 'Basic '+ getEnvConfig('API_KEY')){
            return true;
        }
    }

    let userId, userRole;
    const doSessionAuth = getEnvConfig('ENABLE_SESSION_AUTH', true);
    const doJwtAuth = getEnvConfig('ENABLE_JWT_AUTH', true);

    if(doSessionAuth) {
        try {
            const session = await getSessionStore(req);
            userId = session.user_id;
            userRole = session.role;
        } catch (e) {
            if(!doJwtAuth){
                throw e;
            }
        }
    }

    if(!userId && doJwtAuth){
        const tokenData = getJwtData(req);
        userId = tokenData.user_id;
        userRole = tokenData.role;
    }

    // const ipAddress = (new LocationHelper(req)).getIpAddress();
    // if(ipAddress != session.ip_address){
    // req.session.destroy();
    // throw new Exception('ip_mismatch', status.unauthorized);
    // }


    if((isAdminPath(req) && userRole < UserRoles.ROLE_ADMIN) || minRole > userRole){
        throw new Exception('no_access', status.unauthorized);
    }

    const payloadUserId = typeof req.body.user_id === 'string' ? parseInt(req.body.user_id) : req.body.user_id;

    if (payloadUserId && payloadUserId !== userId && userRole < UserRoles.ROLE_ADMIN) {
        // only staff users are allowed to edit other users than themselves
        throw new Exception('session_user_mismatch', status.unauthorized);
    }

    return true;
}

const getSessionIdFromRequest = (req) => {
    let sessionId = req.body['session_id'];
    if(!sessionId && req.headers['authorization'] && req.headers['authorization'].startsWith('CH-User-Session-Token ')) {
        sessionId = req.headers['authorization'].split(' ')[1];
    }
    return sessionId
}

export const checkAdminAuth = async (req):Promise<boolean> => {
    return await checkAuth(req, UserRoles.ROLE_ADMIN);
}

export const checkNoSession = async (req, throwOnSesssion = false):Promise<boolean> => {
    if(!getEnvConfig('ENABLE_SESSION_AUTH', true)){
        return true;
    }
    let session;
    try{
        session = await getSessionStore(req);
        if(session.email && throwOnSesssion){
            throw new Exception('already_logged_in', status.error);
        }
    }catch(e){
        if(e.message === 'no_session'){
            return true;
        }
        throw e;
    }
}

export const addToIpBlacklist = async (ipAddress) => {
    const ipWhitelist:string[] = getEnvConfig('IP_WHITELIST', []);
    if(!ipWhitelist.includes(ipAddress)){
        await addedit('ip_blacklist', {ip_address:ipAddress, blacklist_reason:'too_many_token_login_fails'}, 'id', 'add', ['*'])
    }
}