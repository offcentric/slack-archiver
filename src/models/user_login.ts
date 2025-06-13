import { Request } from 'express';
import PureDbModel from "../models/_pureDbModel";
import Metadata from '../interfaces/_metadata';
import {db} from "db/knex";

const metadata:Array<Metadata> = [
    {
        key:"email",
        type : "string",
        required : true,
        show_in_list : true,
    },
    {
        key:"uid",
        type : "string",
        required : true,
        show_in_list : true,
    },
    {
        key:"timestamp",
        type : "datetime",
        required : true,
        show_in_list : true,
    },
    {
        key:"success",
        type : "boolean",
        required : true,
        show_in_list : true,
    },
    {
        key:"remote_address",
        type : "string",
        show_in_list : true,
    },
    {
        key:"fail_reason",
        type : "string",
        show_in_list : true,
    }
];

class UserLogin extends PureDbModel{
    constructor(req:Request){
        super('user_login', {metadata}, req);
    }
    indexField = 'id';

    async getLoginFails(ipAddress, minutes = 5){
        return (await db.raw("SELECT * FROM (SELECT *, EXTRACT(EPOCH FROM(NOW() - timestamp)) / 60 as minute_difference from user_login) user_login WHERE remote_address = ? AND fail_reason = 'auth_fail' AND minute_difference < ?;", [ipAddress, minutes])).rows;
    }
}


export { UserLogin }
