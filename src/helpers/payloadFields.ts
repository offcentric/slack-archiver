import {Request} from 'express';
import {isEmpty, isValidDatetime, isValidEmail, isValidPassword, isValidTimestamp} from "../helpers/validate";
import Exception from '../models/exception';
import {PayloadFields as FileFields} from '../payload/file';
import {PayloadFields as ErrorLogFields} from '../payload/errorlog';
import {PayloadFields as MessageFields} from '../payload/message';
import {PayloadItemInterface} from "interfaces/payload";

const AllFields = {
    'message': MessageFields,
    'file': FileFields,
    'errorlog': ErrorLogFields,
};

export const getPayload = (req:Request, forContentful = false, bodyOverride?:Record<string, any>) => {
    let path: string;

    if(req.originalUrl.indexOf('.websocket') !== -1){
        path = req.originalUrl.match(/\/(.*)\/.websocket/)[1];
    }else{
        path = req.originalUrl.match(/\/(.*)/)[1];
    }

    const body = bodyOverride ?? req.body
    const fields:Array<PayloadItemInterface> = getPayloadFields(path, forContentful);
    return processPayload(req, fields, body)
}

export const getPayloadForPath = (req: Request, path: string, body: Record<string, any>, forContentful = false) => {
    const fields:Array<PayloadItemInterface> = getPayloadFields(path, forContentful);
    return processPayload(req, fields, body)
}

export const getPayloadFields = (path:string, forContentful = false):Array<PayloadItemInterface> => {
    let endpoint, idx;
    const regexIdx = new RegExp(/[a-z0-9]+/i);

    if(path.indexOf("?") !== -1){
        const parts = (path.split('?'));
        path = parts[0];
    }
    console.log("GET PAYLOAD FOR PATH1", path);


    const pathParts = path.split('/');
    if (pathParts[0] === 'adm') {
        pathParts.shift();
    }

    const api = pathParts.shift();
    endpoint = forContentful ? 'contentful' : pathParts.shift().toLowerCase();

    if(pathParts.length){
        if(regexIdx.test(pathParts[0])){
            idx = pathParts.shift();
        }else if(pathParts[0].indexOf(':') === -1){
            endpoint += '/'+ pathParts.shift().toLowerCase();
        }
    }
    console.log("GET ENDPOINT", endpoint);

    if (api && !AllFields[api]) {
        return [];
    }

    const ret = [];
    if (AllFields[api][endpoint]) {
        const fields = AllFields[api][endpoint];
        Object.keys(fields).forEach((i) => {
            const field = fields[i];
            const item = {key: i, ...fields[i]};
            if(idx && field.inpath){
                item.value = idx;
            }
            ret.push(item);
        });
    } else {
        // throw new Exception('no payload fields for endpoint '+api+'/'+endpoint);
    }
    return ret;
}

const processPayload = (req:Request, fields:Array<PayloadItemInterface>, body:Record<string, any>) =>{
    let required_errors = [];
    const validation_errors = [];
    const payload: any = {};


    const query = req.query;
    let richText = false;
    fields.forEach(function (el) {
        const {type, key, inpath, required, isVirtual, regexp, parser, table, relationType} = el;
        if (type === 'path') {
            payload[key] = el.value;
            return;
        }
        if(!payload[key] && inpath && Object.keys(req.params).indexOf(key) !== -1){
            payload[key] = req.params[key]
            return;
        }
        let value = (body[key] === null || typeof body[key] === 'undefined') ? query[key] : body[key];
// console.log("FIELD VALUE "+key, value);
        if (isEmpty(value) && !isVirtual){
            if(required === true){
                required_errors.push(key);
                return;
            }
            if(typeof required === 'string' && required.indexOf('||') === 0){
                const orField = required.substring(2);
                if(isEmpty(body[orField])){
                    required_errors.push(key);
                    required_errors.push(orField);
                    return;
                }
            }
        }
        if (regexp) {
            const regex = new RegExp(regexp);
            if (!regex.test(value)) {
                validation_errors.push(key);
                return;
            }
        }
        if (!isVirtual && typeof value == 'undefined') {
            return;
        }

        if (type == 'custom' && !!parser) {
            value = parser(body);
        }else if (type == 'integer') {
            value = parseInt(value);
            if (isNaN(value)) {
                value = null;
            }
        } else if (type == 'float') {
            value = parseFloat(value);
            if (isNaN(value)) {
                value = null;
            }
        }else if(type == 'timestamp'){
            if(!isValidTimestamp(value)){
                validation_errors.push(key);
                return;
            }else{
                value = parseInt(value);
                if(value.length === 10){
                    value*=1000;
                }
                value = new Date(value);
            }
        }else if(type === 'string'){
            value = value+'';
        }else if(type === 'boolean'){
            value = (value == "true" || value == 1)
        }else if(type === 'password' && !(req._parsedUrl.pathname == '/login' || (req._parsedUrl.pathname == '/changepassword' && key == 'password')) && !isValidPassword(value)){
            validation_errors.push(key);
            return;
        }else if(type === 'email'){
            value = value.toLowerCase();
            if(!isValidEmail(value)){
                validation_errors.push(key);
                return;
            }
        }else if(type === 'datetime' && !isValidDatetime(value)){
            validation_errors.push(key);
            return;
        }else if(type === 'richtext'){
            richText = true;
        }else if(type === 'relation') {
            value = {__value: value, __joinTable: table, __relationType: relationType};
        }else if(type === 'array'){
            if(value !== null && !Array.isArray(value)){
                validation_errors.push(key);
                return;
            }
        }
        payload[key] = value;
    });
    required_errors = Array.from(new Set(required_errors));
    if (required_errors.length) {
        throw new Exception('missing_required_fields : ' + '{' + required_errors.join(',') + '}', 400);
    }
    if (validation_errors.length) {
        throw new Exception('invalid_data_for_fields : ' + '{' + validation_errors.join(',') + '}', 400);
    }
    return payload;
}