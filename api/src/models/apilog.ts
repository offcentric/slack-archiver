import { Request } from 'express';
import {maskPrivateData} from "helpers/tools";
import Metadata from '../interfaces/_metadata';
import PureDbModel from "../models/_pureDbModel";
import {SavePayload} from "payload/_abstract";

const metadata:Array<Metadata> = [
    {
        key:"id",
        type : "string",
        sortable_key: 'id',
        show_in_list : true,
    },
    {
        key:"path",
        type : "string",
        sortable_key: 'path',
        searchable: true,
        show_in_list : true,
    },
    {
        key:"payload",
        type : "string",
        show_in_list : true,
    },
    {
        key:"method",
        type : "string",
        show_in_list : true,
    },
    {
        key:"response_code",
        type : "integer",
        show_in_list : true,
        searchable: true
    },
    {
        key:"response_data",
        type : "string",
        show_in_list : true,
    },
    {
        key:"remote_ip",
        type : "string",
        show_in_list : true,
        searchable: true
    },
    {
        key:"headers",
        type : "string",
        show_in_list : true,
    },
    {
        key:"request_at",
        type : "datetime",
        show_in_list : true,
    },
    {
        key:"response_at",
        type : "datetime",
        show_in_list : true,
    },
    {
        key:"response_time",
        type : "integer",
        show_in_list : true,
    },
];

export class ApiLog extends PureDbModel{
    indexField = 'id';
    constructor(req:Request){
        super('api_log', {metadata}, req);
    }

    prepareSavePayload(payload:SavePayload){
        maskPrivateData(payload, ['payload', 'response_data']);
        return payload;
    }
}
