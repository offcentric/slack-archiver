import { getEnvConfig } from '../helpers/config';
import { UserRoles } from '../helpers/user';
import {status} from '../helpers/status';
import Exception from '../models/exception';
import ExceptionMuted from "../models/exceptionmuted";
import {addedit} from "helpers/data";
import {Request} from "express";
import {UserSession} from "interfaces/user";
import {LocationHelper} from "helpers/location";

export interface SessionStore{
    session_id:string,
    ip_address: string,
    email: string,
    user_id: number,
    workspaces: string[],
    cookie?:Record<string, any>
}

export const createSession = async(req:Request, userData:UserSession):Promise<string> => {
    const session = req.session;
    const locationHelper = new LocationHelper(req);
    session.email = userData.email;
    session.workspaces = userData.workspaces;
    session.ip_address = locationHelper.getIpAddress();
    session.session_id = req.sessionID;
    req.session.save();
    return req.sessionID;
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

export const getSessionId = async(req) => {
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

export const checkAuth = async (req):Promise<SessionStore> => {
    let userId, userRole;
    const session = await getSessionStore(req);
    userId = session.user_id;

    const payloadUserId = typeof req.body.user_id === 'string' ? parseInt(req.body.user_id) : req.body.user_id;

    if (payloadUserId && payloadUserId !== userId && userRole < UserRoles.ROLE_ADMIN) {
        // only staff users are allowed to edit other users than themselves
        throw new Exception('session_user_mismatch', status.unauthorized);
    }
    return session;
}

const getSessionIdFromRequest = (req) => {
    let sessionId = req.body['session_id'];
    if(!sessionId && req.headers['authorization'] && req.headers['authorization'].startsWith('CH-Slackuser-Session-Token ')) {
        sessionId = req.headers['authorization'].split(' ')[1];
    }
    return sessionId
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