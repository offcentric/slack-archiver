import {db as mysql} from './knex-mysql';
import {db as pg} from './knex-pg';
import { getEnvConfig } from '../helpers/config';
import Exception from "models/exception";
const dbEngine:string = getEnvConfig('DATABASE_ENGINE');

let db = null;

 if(dbEngine === 'mysql'){
    db = mysql;
}else if(dbEngine === 'pg'){
    db = pg;
}

if(!db){
    throw new Exception('missing_or_unknown_database_engine');
}

console.log("DB", db.context.client.config);
export {db};