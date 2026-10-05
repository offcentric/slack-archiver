import {PayloadInterface} from '../interfaces/payload.js';

export const PayloadFields:PayloadInterface = {
    list: {
        user: {type:'object', table: 'user', relationType: 'many'},
        workspace: {type:'string', required: true},
        date_from: {type:'string'},
        date_to: {type:'string'},
        channel: {type:'string'},
        text: {type:'string'},
    },
    listthreaded: {
        user: {type:'object', table: 'user', relationType: 'many'},
        workspace: {type:'string', required: true},
        date_from: {type:'string'},
        date_to: {type:'string'},
        channel: {type:'string'},
        text: {type:'string'},
    },
    channels: {
        workspace: {type:'string', required: true},
    },
    stats: {
        workspace: {type:'string', required: true},
    },
    get: {
        id: {type:'number', required: "||ts"},
        ts: {type:'string', required: "||id"},
    },
    add: {},
    update: {},
    delete: {},
    search: {
        q: {type:'string', required: true},
        limit: {type:'number'},
        page: {type:'number'},
        workspace: {type:'string'},
        channel: {type:'string'},
        user: {type:'string'},
    }
};

