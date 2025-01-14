import {successMessage, errorMessage, status, codes} from './status';
import Exception from '../models/exception';

export const responseHeaders = {
    'Content-Type': 'application/json',
    'Content-Security-Policy': 'connect-src self http://localhost https://*.cyclinghero.cc'
};

export const returnSuccess = (res, successMsg:Record<string, any> = successMessage, doResponse = true, code:number = status.success) => {
    if(codes.indexOf(code) != -1){ // ensure the code is valid in http schema
        code = status.success;
    }
    return doResponse ? res.status(code).send(successMsg) : successMsg;
}

export const returnError = (res, message:string = errorMessage.message, code:number = status.bad, doResponse = true) => {
    const errMsg = {...errorMessage};
    errMsg.message = message;
    if(codes.indexOf(code) === -1){ // ensure the code is valid in http schema
        code = status.error;
    }
    return doResponse ? res.status(code).json(errMsg) : errMsg;
}

export const returnExceptionAsError = (res, e:Exception, doResponse = true) => {
    console.log("ERROR",e);
    let errMsg = {}
    let code = 500;
    errMsg = {...errorMessage};
    for(const el in errMsg){
        if(e[el]){
            errMsg[el] = e[el];
        }
    }
    if(codes.indexOf(e.code) != -1){ // ensure the code is valid in http schema
        code = e.code;
    }
    return doResponse ? res.status(code).json(errMsg) : errMsg;
}
