import {status,} from '../helpers/status';
import Exception from "./exception";

export default class ExceptionMuted extends Exception{
    constructor(msg:string = 'unspecified_error', code:number = status.error, detail?) {
        super(msg, code, detail, true);
    }
}