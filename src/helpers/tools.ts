import { createHash } from 'crypto';
import {get as getCache, set as setCache} from '../helpers/cache';
import {getEnvConfig} from "helpers/config";

export const generateUuid = (length : number = 32) => {
    const currentDate = (new Date()).valueOf().toString();
    const random = Math.random().toString();
    return createHash('sha1').update(currentDate + random).digest('hex').substring(0, length);
};

export const generateAlphaUuid = (length : number = 8) => {
    const letters = [];
    for(let x=65;x<=90;x++){
        letters.push(String.fromCharCode(x));
    }
    for(let x=97;x<=122;x++){
        letters.push(String.fromCharCode(x));
    }
    let ret = '';
    for(let x=0;x<length;x++){
        ret += letters[Math.round(Math.random()*letters.length)];
    }
    return ret;
}

export const isTruthy = (input:any):boolean => {
    return input === true || input === 'true' || input === 1 || input === '1';
}

export const isString = (input:any):boolean => {
    return (typeof input === 'string' || input instanceof String);
}

export const shouldRun = async (func:Function|string, interval:number, args?:Array<any>):Promise<boolean> => {

    const funcName = typeof func === 'function' ? func.name : func;
    const cacheKey = `shouldRun-${funcName}${args && args.length? '-'+args.join('|'):null}`;
    const lastRun = await getCache(cacheKey, true)
    const now = Date.now()/1000;
    if(lastRun && now < lastRun+interval){
        console.log("ALREADY RUN", cacheKey, lastRun)
        return false;
    }
    console.log("CAN RUN", cacheKey, interval)
    await setCache(cacheKey, now, 9999);
    return true;
}

export const forceFloat = (number:any, precision:number = 2) => {
    number = number+'';
    if(number.indexOf('.') === -1){
        number = number + '.0';
        for(let i = 0; i < precision-1; i++){
            number = number + '0';
        }
        //stupid workaround
        number = number + '1';
    }else{
        const regex = new RegExp("([0-9]+)\\.([0-9]{1,"+precision+"}).*");
        number = number.replace(regex, "$1.$2");
    }
    return parseFloat(number);
}

export function keysOf<T extends object>(obj: T): Array<keyof T> {
    return Array.from(Object.keys(obj)) as any;
}

export const maskPrivateData = (data:any, fields:Array<string>) => {
    if(!getEnvConfig('ENABLE_MASK_PRIVATE_DATA', true)){
        return;
    }

    for(const field of fields){
        if(data[field]){
            const jsonData = JSON.parse(data[field]);
            for(const key of ['password', 'login_token', 'token', 'jwt_token', 'session_id']){
                if(jsonData[key]){
                    jsonData[key] = '********';
                }
            }
            data[field] = JSON.stringify(jsonData);
        }
    }
}