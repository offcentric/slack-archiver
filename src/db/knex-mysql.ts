import knex, {Knex} from 'knex';
import { getEnvConfig } from '../helpers/config';

const params:Knex.Config = {
    client: 'mysql2',
    connection: getEnvConfig('DATABASE_URL_MYSQL'),
    asyncStackTraces:true
}

const db = knex(params);

export {db};
