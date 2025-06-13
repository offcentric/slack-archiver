import NodeCache from "node-cache";
import {createHash} from 'crypto';

var client:NodeCache = null;
var envPrefix = 'c_';

const initClient = () => {
    if(client === null){
        client = new NodeCache();
    }
    return client;
}

export const set = (key:string, value:any, ttl:number = 3600) => {
    if(typeof value !== "string"){
        value = JSON.stringify(value)
    }
    initClient();
    client.set(envPrefix+key, value, ttl);
}

export const get = (key:string) => {
    initClient();

    let value:any = client.get(envPrefix+key);
    try{
        value = JSON.parse(value);
    }catch(e){
        // do nothing
    }
    if(value === null || typeof value === 'undefined'){
        value = false;
    }
    return value;
}

export const del = async (key:string) => {
    await initClient();

    await initClient();
    return client.del(envPrefix+key);
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

export const flush = async() => {
    client.flushAll();
    console.log(`************ FLUSHED NODE CACHE *************`);
}