import { logError } from '../helpers/errorlog';
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

const SAFE_MESSAGE = /^[a-z0-9_ :{}.,'+-]{1,200}$/i;

export const clientErrorMessage = (message: unknown): string => {
    if (typeof message !== 'string') {
        return 'backend_error';
    }
    const trimmed = message.trim();
    if (!SAFE_MESSAGE.test(trimmed) || /stack|routine|parse_relation|does not exist/i.test(trimmed)) {
        return 'backend_error';
    }
    return trimmed;
};

export const returnError = (res:Response, message:unknown = errorMessage.message, code:number = status.bad, doResponse = true) => {
    if (typeof message !== 'string') {
        console.error('API error', message);
    }
    const errMsg = {...errorMessage};
    errMsg.message = clientErrorMessage(message);
    delete errMsg.stack;
    if(codes.indexOf(code) === -1){ // ensure the code is valid in http schema
        code = status.error;
    }
    logError(new Exception(errMsg.message, code));
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

export const outputErrorData = (e:ExceptionInterface|Error) => {
    console.error('API exception', e);
    const errMsg = {...errorMessage};
    errMsg.message = clientErrorMessage(e?.message);
    const detail = (e as ExceptionInterface)?.detail;
    errMsg.detail = typeof detail === 'string' ? clientErrorMessage(detail) : null;
    if (errMsg.detail === 'backend_error') {
        errMsg.detail = null;
    }
    delete errMsg.stack;
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
