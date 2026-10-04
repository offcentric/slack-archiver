import {PayloadInterface} from '../interfaces/payload.js';

export const PayloadFields: PayloadInterface = {
    sync: {
        action: {type: 'string', required: true},
        workspace: {type: 'string', required: true},
        channel: {type: 'string'},
        latest: {type: 'string'},
        oldest: {type: 'string'},
        limit: {type: 'integer'},
    },
    channels: {
        workspace: {type: 'string', required: true},
    },
};
