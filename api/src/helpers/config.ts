import * as dotenvx from '@dotenvx/dotenvx';
dotenvx.config();

export const getEnvConfig = (key:string, defaultValue?:any, parseAs?:string) => {
    if( typeof process.env[key] !== 'undefined'){
        let ret:any = process.env[key];
        if(parseAs === 'integer' || typeof defaultValue === 'number'){
            ret = parseInt(ret);
        }else if(parseAs === 'boolean' || typeof defaultValue === 'boolean'){
            ret = (ret == 'true' || ret == '1')
        }else if(parseAs === 'array' || (defaultValue && Array.isArray(defaultValue))){
            ret = ret.split(',');
        }
        return ret;
    }
    return defaultValue;
}
