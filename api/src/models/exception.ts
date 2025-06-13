import {status,} from '../helpers/status';
import {isLocalEnvironment} from '../helpers/env';

export interface ExceptionInterface{
    code:number,
    message:string,
    detail:string,
    stack:string,
}
export default class Exception extends Error{

    code = status.error;
    status = 'error';
    detail = {};

    constructor(msg:string = 'unspecified_error', code:number = status.error, detail?, mute = false){
        super();
        this.code = code;
        this.message = msg;
        this.detail = typeof detail === 'object' ? JSON.stringify(detail) : detail;
        if(isLocalEnvironment && !mute){
            console.log("[DEV] Exception", this);
        }
    }
}