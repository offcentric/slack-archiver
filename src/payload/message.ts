import {PayloadInterface} from '../interfaces/payload.js';

export const PayloadFields:PayloadInterface = {
    list: {
        user: {type:'object', table: 'user', relationType: 'many'},
        page: {type: 'integer',},
        orderfield: {type: 'string',},
        orderdirection: {type: 'string'}
    },
    get: {},
    add: {},
    update: {},
    delete: {}
};

