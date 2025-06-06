import {db} from '../db/knex';
import Exception, { ExceptionInterface } from '../models/exception';
import ErrorLogInterface from '../interfaces/errorlog';
import {status} from '../helpers/status';
import StackTracey from 'stacktracey'

const getErrorCode = (e:Error|ExceptionInterface) => {
    if(e instanceof Exception){
        if(typeof e.code === 'string'){
            switch(e.code){
                case 'ERR_BAD_REQUEST':
                    return 400;
                default:
                    return 500;
            }
        }else{
            return e.code;
        }
    }
    return status.error;
}

export const logError = (e:ExceptionInterface|Error|TypeError) => {
    let message = e.message;
    if(typeof e.message === 'object'){
        message = message.toString();
    }
    message = message.substring(0,128);
    const params:ErrorLogInterface = {message, code:getErrorCode(e), stacktrace:e.stack};
    const stack = new StackTracey (e.stack);
    if(stack.items.length){
        const item = stack.items[0]

        params.method = item.calleeShort
        params.filepath = item.fileRelative;
        params.filename = item.fileName;
        params.line_number = item.line;
    }

    if(e instanceof Exception){
        params.params = e.detail;
    }
    try{
        db.transaction(async (trx) => {
            const results = await trx('error_log').insert(params).returning('*');
// console.log("****** ERROR LOG INSERT RESPONSE ***************", results);
            return results;
        });
    }catch(error){
        console.error(error);
    }
};