import {status,} from '../helpers/status';

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

    constructor(msg:string = 'unspecified_error', code:number = status.error, detail?){
        super();
        this.code = code;
        this.message = msg;
        this.detail = detail;
        console.log("[DEV] Exception", this);
    }
}