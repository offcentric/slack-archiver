import NodeCache from "node-cache";

import {createHash} from 'crypto';
import { getEnvConfig } from './config';

var client = null;
var envPrefix = 'c_';

export const isRedisEnabled = getEnvConfig('ENABLE_REDIS', false);
export const redisId = getEnvConfig('REDIS_DATABASE_NUMBER');
const environment = getEnvConfig('ENVIRONMENT');
let forceNodeCache = false;

const initClient = async (forceNC = false) => {
    forceNodeCache = forceNC;
    if(client === null){
        client = new NodeCache();
    }
    return client;
}

export const set = async (key:string, value:any, ttl:number = 3600, forceNodeCache = false) => {
    if(typeof value !== "string"){
        value = JSON.stringify(value)
    }
    //
    // console.log("**************************************************** CACHE IS SET FOR "+key, value)

    await initClient(forceNodeCache);
    client.set(envPrefix+key, value, ttl);
}

export const get = async (key:string, forceNodeCache = false) => {
    await initClient(forceNodeCache);

    let value:any = await client.get(envPrefix+key);
    try{
        value = JSON.parse(value);
    }catch(e){
        // do nothing
    }
    if(value === null || typeof value === 'undefined'){
        value = false;
    }
    // console.log("GOT CACHE FOR "+key, value)
    return value;
}

export const del = async (key:string) => {
    await initClient();

    await initClient();
    return await client.del(envPrefix+key);
}

export const getCacheKey = (method:string, tableName:string, ...args) => {
    if(!args.length){
        return method+'_'+tableName;
    }

    let keyraw = "";
    // console.log("ARGS FOR CACHE KEY", args);
    args.forEach((i) => {
        if(typeof i === 'string' || typeof i === 'number'){
            keyraw += i;
        }else if(typeof i === 'boolean'){
            keyraw += i ? '1' : '0';
        }else if(typeof i === 'object'){
            keyraw += JSON.stringify(i);
        }
    });
    const hash = createHash('sha1').update(keyraw).digest('hex');
    const ret = method+'_'+tableName+'_'+hash;
    // console.log("****************************************** CACHE KEY **********************************************************", ret);
    return ret;
}

export const flush = async(forceNodeCache = false) => {
    client.flushAll();
    console.log(`************ FLUSHED NODE CACHE *************`);
}