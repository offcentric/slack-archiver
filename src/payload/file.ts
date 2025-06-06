import {PayloadInterface} from '../interfaces/payload.js';

export const PayloadFields:PayloadInterface = {
    list: {
        user: {type:'object', table: 'user', relationType: 'many'},
    },
    get: {},
    add: {},
    update: {},
    delete: {}
};

