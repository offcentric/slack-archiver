import {PayloadInterface} from '../interfaces/payload.js';

export const PayloadFields:PayloadInterface = {
    list: {
        user: {type:'string'},
        workspace: {type:'string'},
        channel: {type:'string'},
        media: {type:'boolean'},
        date_from: {type:'string'},
        date_to: {type:'string'},
    },
    get: {
        id: {type:'number', required: true},
    },
    add: {},
    update: {},
    delete: {}
};

