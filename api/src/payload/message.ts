import {PayloadInterface} from '../interfaces/payload.js';

export const PayloadFields:PayloadInterface = {
    list: {
        user: {type:'object', table: 'user', relationType: 'many'},
        date_from: {type:'string'},
        date_to: {type:'string'},
        workspace: {type:'string'},
        channel: {type:'string'}
    },
    get: {
        id: {type:'number', required: "||ts"},
        ts: {type:'number', required: "||id"},
    },
    add: {},
    update: {},
    delete: {},
    search: {
        q: {type:'string', required: true},
        limit: {type:'number'},
        page: {type:'number'},
        workspace: {type:'string'},
        channel: {type:'string'}
    }
};

