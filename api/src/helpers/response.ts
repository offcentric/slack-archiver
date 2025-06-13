import { logError } from '../helpers/errorlog';
import {isDevEnvironment} from '../helpers/env';
import {successMessage, errorMessage, status, codes} from '../helpers/status';
import {Response} from "../interfaces/controller";
import Exception, {ExceptionInterface} from '../models/exception';

export const responseHeaders = {
    'Content-Type': 'application/json',
    'Content-Security-Policy': 'connect-src self http://localhost https://*.cyclinghero.cc'
};

export const returnSuccess = (res:Response, successMsg:Record<string, any> = successMessage, doResponse = true, code:number = status.success) => {
    if(codes.indexOf(code) != -1){ // ensure the code is valid in http schema
        code = status.success;
    }
    return doResponse ? res.status(code).send(successMsg) : successMsg;
}

export const returnError = (res:Response, message:string = errorMessage.message, code:number = status.bad, doResponse = true) => {
    const errMsg = {...errorMessage};
    errMsg.message = message;
    if(codes.indexOf(code) === -1){ // ensure the code is valid in http schema
        code = status.error;
    }
    logError(new Exception(message, code));
    return doResponse ? res.status(code).json(errMsg) : errMsg;
}

export const returnExceptionAsError = (res:Response, e:Exception, doResponse = true) => {
    console.log("ERROR",e);
    let code = 500;
    const errMsg = outputErrorData(e)
    if(codes.indexOf(e.code) != -1){ // ensure the code is valid in http schema
        code = e.code;
    }
    logError(e);
    return doResponse ? res.status(code).json(errMsg) : errMsg;
}

export const outputErrorData = (e:ExceptionInterface|Error, showStack = false) => {
    const errMsg = {...errorMessage};
    for(const el in errMsg){
        if(e[el]){
            errMsg[el] = e[el];
        }
    }
    if(!isDevEnvironment && !showStack){
        delete(errMsg['stack']);
    }
    return errMsg;
}

export const handleError = (res:Response, e:Exception|TypeError|string) => {
    if(e instanceof Exception){
        return returnExceptionAsError(res, e);
    }
    if(e instanceof TypeError){
        return returnError(res, e.message);
    }
    return returnError(res, e);
}

export const redirect = (res:Response, url:string, code:number = status.redirect) => {
    if(codes.indexOf(code) != -1){ // ensure the code is valid in http schema
        code = status.redirect;
    }
    return res.status(code).set({'Location':url}).send();
}
