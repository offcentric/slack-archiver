import knex, {Knex} from 'knex';
import { getEnvConfig } from '../helpers/config';

const params:Knex.Config = {
    client: 'pg',
    connection: getEnvConfig('DATABASE_URL'),
    searchPath: ['slack','public'],
    asyncStackTraces:true
}

const db = knex(params);

export {db};
