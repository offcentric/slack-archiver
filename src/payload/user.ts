import {PayloadInterface} from '../interfaces/payload.js';

export const PayloadFields:PayloadInterface = {
    sendlogincode: {
        email: {type:'email', required:true}
    },
    login: {
        email: {type:'email', required:true},
        code: {type:'number', required:true}
    },
};