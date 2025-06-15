import { Request } from 'express';
import {db} from '../db/knex';
import {set as setCache, get as getCache, getCacheKey} from '../helpers/cache';
import {getEnvConfig} from "helpers/config";
import {
    getBy,
    getCollection,
    getCount,
    addedit,
    upsert,
    update,
    hardDeleteItem,
    SaveAction
} from '../helpers/data';
import {getNow} from "helpers/date";
import {getPayloadForPath} from "helpers/payloadFields";
import {search} from '../helpers/search';
import {status} from '../helpers/status';
import ApiObject from "../interfaces/_apiobject";
import Generic from "interfaces/_generic";
import Metadata, {ChildRelation} from "../interfaces/_metadata";
import Exception from '../models/exception';
import AbstractDbModel from "models/_abstractDbModel";
import {QueryPayload, SavePayload} from "../payload/_abstract";

export interface CollectionResponse{
    items:Array<any>,
    totalitems?:number,
    totalpages?:number,
    page?:number,
    has_more?:boolean
}

export interface ChildData {
    modelInstance: AbstractDbModel;
    path: string;
    payloadKey: string;
    linkedKey: string;
    outKey: string;
}

export default class GenericModel{
    request:Request = null;
    tableName = '';
    fields = [];
    data = {};
    collectionParams:Record<string, any> = {};
    orderBy = null;
    limit:number[]|number = null;
    detail = false;
    extended:Array<string>|false = false;
    forAdmin = false;

    metadataMemoized = {};

    viewNameList = '';
    viewNameSingle = '';
    indexField  =  'uid';
    lookupIndexField = 'code';
    listAll = false;
    responseFields = [];
    joins = [];
    cacheTtl:number|false = false;
    ignoreCache = false;
    isAdm: boolean;
    codePrefix: string;
    workspace: string;

    metadata:Array<Metadata> = [
        {
            key:'uid',
            type:'string',
            formtype:'hidden',
            show_in_list:true
        }
    ];

    constructor(tableName:string, params:Record<string, any> = {}, request:Request, ignoreCache = false){
        this.tableName = tableName;
        this.ignoreCache = ignoreCache;
        for(const k in params) this[k] = params[k];

        this.request = request;
        this.isAdm = this.request?.app?.get('isAdm') || false;
    }

    async enrichItem(_item){}

    processCollectionData(_items){}

    async _load(uid:string, key = null, detail = false):Promise<ApiObject>{
        if(!key){
            key = this.indexField;
        }
        this.detail = detail;
        const params = {};
        params[key] = uid;

        // never return a row that is soft deleted
        if(this.hasMetadataField('deleted')){
            params['deleted'] = false;
        }
        const ret:Record<string, any> = await this._get(params);
        this.data = ret;
        return ret;
    }

    async _get(params:Record<string, any>, throwIfMissing = true, detail = false):Promise<any>{
        if(!params || !Object.keys(params).length){
            throw new Exception('missing_filter');
        }
        this.detail = detail;
        const metadata: Metadata[] = this.getMetadata();
        const joins = [];
        await this.getJoinsFromMetadata(joins, metadata);
        joins.push(...this.joins);
        const responseFields = await this.getResponseFields();
        const viewOrTable = this.viewNameSingle ? this.viewNameSingle : this.tableName;

        // never return a row that is soft deleted
        if(this.hasMetadataField('deleted')){
            params['deleted'] = false;
        }
        const ret:ApiObject = await getBy(viewOrTable, params, joins, throwIfMissing, responseFields, this.cacheTtl);
        if(ret){
            this.data = ret;
            await this.enrichItem(ret);
        }
        return ret;
    }

    async _processCollectionParams(params:Record<string, any>, orderBy?:string|Array<string|Record<string, any>>, limit?:Array<number>|number):Promise<void>{
        if(orderBy) {
            this.orderBy = orderBy;
        }
        if(params){
            this.collectionParams = params;
        }
        if(limit){
            this.limit = limit;
        }
    }

    async _getCollection(params:QueryPayload = {}, orderBy?:string|Array<string|Record<string, any>>, limit:Array<number>|number = null, addPagination = false, distinct = false,  cacheTtl:number|false = false, detail = false):Promise<{items:Array<any>}>{
        await this._processCollectionParams(params, orderBy, limit);

        const metadata = this.getMetadata();
        const joins = [];
        await this.getJoinsFromMetadata(joins, metadata, true);
        joins.push(...this.joins);
        const responseFields = await this.getResponseFields(true);
        if(cacheTtl === false){
            cacheTtl = this.cacheTtl
        }
        // never return a row that is soft deleted
        if(this.hasMetadataField('deleted')){
            this.collectionParams['deleted'] = false;
        }
        this.detail = detail;
        const viewOrTable = this.viewNameList ? this.viewNameList : this.tableName;
        const items = await getCollection(viewOrTable, this.collectionParams, responseFields, this.orderBy, joins, this.limit, distinct, cacheTtl);
        for(const item of items){
            await this.enrichItem(item);
        }
        this.processCollectionData(items);
        const ret:CollectionResponse = {items};

        if(addPagination){
            const totalCount = await getCount(viewOrTable, this.collectionParams, joins, distinct, cacheTtl);
            ret.totalitems = totalCount;
            ret.totalpages = totalCount ? Math.ceil(totalCount/items.length) : 0;
            ret.page = Array.isArray(limit) && limit[1] ? limit[1]/limit[0]+1 : 1;
        }
        return ret;
    }

    async _search(searchStr:string, limit?:number, page?:number):Promise<Array<any>>{
        const fields  = this.metadata.filter((item:Metadata) => item.searchable).map((item:Metadata) => item.key);
        return await search(this.tableName, fields, searchStr, limit, page);
    }

    async getField(fieldName:string, payload:QueryPayload){
        this.responseFields = [fieldName];
        const ret = await this._get(payload);
        if(!ret){
            throw new Exception('item_not_found', status.notfound);
        }
        return ret[fieldName];
    }

    getMetadata():Array<Metadata>{
        const memoFlag = 'array'+(this.forAdmin ? 1:0);
        if(this.metadataMemoized[memoFlag]){
            return this.metadataMemoized[memoFlag];
        }
        const ret:Array<Metadata> = [];

        for(const i in this.metadata){
            const item = this.metadata[i];
            if(this.forAdmin || !item.admin_only){
                if(typeof item.child_relation == 'object'){
                    if(!Object.keys(item.child_relation).includes('outfield')){
                        item.child_relation.outfield = 'id';
                    }
                    if(!Object.keys(item.child_relation).includes('output_key')){
                        if(item.type == 'lookup'){
                            item.child_relation.output_key = item.key;
                        }else{
                            item.child_relation.output_key = item.key.substring(0, item.key.indexOf('_code'));
                        }
                    }
                }
                ret.push(item);
            }
        }

        this.metadataMemoized[memoFlag] = ret;
        return ret;
    }

    getMetadataAsObject():Record<string, Metadata>{
        const memoFlag = 'object'+(this.forAdmin ? 1:0);
        if(this.metadataMemoized[memoFlag]){
            return this.metadataMemoized[memoFlag];
        }
        const ret:Record<string, Metadata> = {};
        const metadata = this.getMetadata();
        for(const i in metadata){
            const item = this.metadata[i];
            ret[item.key] = item;
        }
        this.metadataMemoized[memoFlag] = ret;
        return ret;
    }

    hasMetadataField(fieldName:string){
        for(const i in this.metadata){
            if(this.metadata[i].key === fieldName){
                return true;
            }
        }
        return false;
    }

    getAssetMetadataFields():Array<Metadata> {
        const ret:Array<Metadata> = [];
        for(const i in this.metadata){
            const item = this.metadata[i];
            if(['asseturl','assetdata'].includes(item.type)){
                ret.push(item);
            }
        }
        return ret;
    }

    async getJoinsFromMetadata(joins, metadata:Metadata[], forList = false){
        for(const i in metadata){
            if(metadata[i].child_relation && metadata[i].child_relation.for_join){
                const lateral = metadata[i].child_relation.for_join;
                const item = metadata[i];
                if(forList && !item.child_relation.show_in_list){
                    continue;
                }
                const as = item.child_relation.output_key || item.child_relation.table_name;
                const outfield = as+'.'+(item.child_relation.outfield || this.lookupIndexField) + ' as '+as
                let tableOrView = this.tableName;
                if(forList && this.viewNameList){
                    tableOrView = this.viewNameList;
                }else if(!forList && this.viewNameSingle){
                    tableOrView = this.viewNameSingle;
                }
                let second = tableOrView + '.' + item.key;
                if(metadata[i].type === 'array'){
                    second = `any(${second})`;
                }
                const joinTable = item.child_relation.table_name || (new item.child_relation.model(this.request)).tableName;
                joins.push({table:joinTable, as, first:(lateral ? item.child_relation.outfield : as+'.'+(item.child_relation.outfield || 'id')), second, outfield, lateral});
            }
        }
    }

    async getResponseFields(list = false){
        const responseFields = this.responseFields;
        let tableName = this.tableName;
        if(list){
            if(this.viewNameList){
                tableName = this.viewNameList;
            }
        }else{
            if(this.viewNameSingle){
                tableName = this.viewNameSingle;
            }
        }
        if(!responseFields.length){
            const metadata:Array<Metadata> = this.getMetadata();
            metadata.map((el:Metadata)=>{
                if(el.derived_value){
                    return;
                }
                if(el.hidden){
                    return;
                }
                if(list && el.show_in_list === false){
                    return;
                }
                if(el.type !== 'lookup'){
                    responseFields.push(tableName+'.'+el.key);
                }
            })
            if(this.indexField !== null && responseFields.indexOf(tableName+'.'+this.indexField) == -1){
                responseFields.unshift(tableName+'.'+this.indexField);
            }
        }
        // reset this.responseFields override
        this.responseFields = [];

        return responseFields;
    }

    async addChild(item, childModel:GenericModel, childKey:string, lookupField:string = null){
        const field = lookupField || childKey;
        const childCode:string = item[field];
        if(childCode){
            childModel.extended = this.extended;
            const childData = await childModel._get({code:childCode});
            if(childData){
                item[childKey] = childData
            }
        }
        if(lookupField !== childKey){
            delete(item[lookupField]);
        }
    }

    async addChildren(item, childModel:GenericModel, lookupTable, collectionKey, lookupField = null){
        const field = lookupField || collectionKey;
        item[collectionKey] = [];
        let ret;
        let childrenCodes:any = item[field];
        if(childrenCodes && (!Array.isArray(childrenCodes)  || childrenCodes.length)){
            const cKey = getCacheKey('addChildren', this.tableName, childrenCodes);
            ret = await getCache(cKey);
            if(ret === false){
                ret = [];
                if(typeof childrenCodes === 'string'){
                    if(childrenCodes.includes('{')){
                        childrenCodes = JSON.parse(childrenCodes.replace('{','[').replace('}',']'));
                    }else{
                        childrenCodes = [childrenCodes];
                    }
                }
                let childrenData = {};
                if(getEnvConfig('ENABLE_ALLCHILDREN_PRELOAD', false)){
                    childModel.extended = ['all'];
                    childrenData = await this.getAllChildren(childModel, lookupTable);
                }else{
                    childModel.extended = this.extended;
                    const {items} = (await childModel._getCollection({code:childrenCodes}));
                    items.map(item => {childrenData[item.code] = item});
                }
                childrenCodes.forEach(code => {
                    if(!code || !childrenData[code]){
                        return;
                    }
                    const childClone = {...childrenData[code]}
                    ret.push(childClone);
                });
                await setCache(cKey, ret);
            }
            item[collectionKey] = ret;

        }
        if(lookupField !== collectionKey){
            delete(item[lookupField]);
        }
    }

    async getAllChildren(childModel:GenericModel, lookupTable){

        const cKey = getCacheKey('getAllChildren', childModel.tableName);
        const cached = await getCache(cKey);
        if(cached !== false){
            return cached;
        }
        const ret = {};
        try{
            const {items} = await childModel._getCollection({});
            if(!lookupTable){
                items.forEach((el)=>{
                    ret[el.code] = el;
                })
            }else{
                const childrenObj = {};
                items.forEach((el)=>{
                    childrenObj[el.code] = el;
                    delete(childrenObj[el.code].id);
                })
                const lookupKey = childModel.tableName+'_code';
                const lookups = await getCollection(lookupTable,[]);
                lookups.forEach((el)=>{
                    el = {...el, ...childrenObj[el[lookupKey]]};
                    ret[el.code] = el;
                })
            }
            await setCache(cKey, ret);
        }catch(e){
            console.log("ERROR in "+childModel.tableName+' getAllChildren', e);
        }
        return ret;
    }

    async addChildrenSimple(item, childModel, collectionKey, lookupField){

        item[collectionKey] = [];
        const childrenData = await childModel.getAllItems();
        let childrenCodes:any = item[lookupField];
        if(typeof childrenCodes === 'string'){
            childrenCodes = JSON.parse(childrenCodes.replace('{','[').replace('}',']'));
        }

        childrenCodes.forEach(code => {
            if(!code || !childrenData[code]){
                return;
            }
            item[collectionKey].push(childrenData[code]);
        });

        if(lookupField !== collectionKey){
            delete(item[lookupField]);
        }
    }

    async getAllItems(){
        const cKey = getCacheKey('getAllItems', this.tableName);
        const cached = await getCache(cKey);
        if(cached){
            return cached;
        }

        const ret = {};
        try{
            const items = await db(this.tableName).select();
            items.forEach((el)=>{
                ret[el.code] = el;
            })

            await setCache(cKey, ret, 600);
        }catch(e){
            console.log("ERROR in "+this.tableName+' getAllItems', e.message);
        }
        return ret;
    }

    showExtendedData(tableName?: string){
        return this.detail ||(this.extended && (this.extended.includes(tableName ?? this.tableName) || this.extended.includes('all')));
    }

    async _addedit(payload:SavePayload, action:SaveAction = 'add', responseFields = null):Promise<{response:Generic|any, errors:Array<any>}>{
        if(!responseFields){
            responseFields = await this.getResponseFields();
        }
        const ret = {errors:[], response:{}};
        payload = this.prepareSavePayload(payload);
        ret.response = await addedit(this.tableName, payload, this.indexField, action, responseFields);
        return ret;
    }

    async _upsert(updateParams:Record<string, unknown>, whereParams:Record<string, unknown>){
        const responseFields = await this.getResponseFields();
        updateParams = this.prepareSavePayload(updateParams);
        return await upsert(this.tableName, updateParams, whereParams, responseFields);
    }

    async _update(updateParams:Record<string, any>|Record<string, unknown>, whereParams:Record<string, unknown>){
        const responseFields = await this.getResponseFields();
        updateParams = this.prepareSavePayload(updateParams);
        return await update(this.tableName, updateParams, whereParams, responseFields);
    }

    prepareSavePayload(payload:SavePayload):SavePayload{
        return payload;
    }

    getChildFromMetadata(metadata:Metadata):ChildData|false{
        const relationData = metadata.child_relation;

        if(!relationData || !relationData.model){
            return false;
        }
        const payloadKey:string = relationData.save_payload_key;
        const linkedKey:string = relationData.linked_key;
        const outKey:string = metadata.key;

        const modelInstance = this.getChildModelInstance(relationData);
        const path = relationData.path ?? modelInstance.tableName;
        return {modelInstance, path, payloadKey, linkedKey, outKey};
    }

    async saveChildren(payload:Record<string, any>, action:SaveAction){
        const metadata = this.getMetadata();
        for(const i in metadata){
            const metadataItem = metadata[i];
            const child = this.getChildFromMetadata(metadataItem);
            if(child === false || !child.payloadKey){
                continue;
            }
            let linkedKeys;
            if(Array.isArray(payload[child.payloadKey])){
                linkedKeys = [];
                for(const x in payload[child.payloadKey]){
                    const childData = payload[child.payloadKey][x];
                    const key = await this.saveChildItem(child, childData, action)
                    linkedKeys.push(key);
                }
            }else{
                const childPayload = payload[child.payloadKey];
                if(childPayload){
                    linkedKeys = await this.saveChildItem(child, childPayload, action)
                }else{
                    linkedKeys = payload[metadataItem.key];
                }
            }
            if(linkedKeys){
                payload[child.outKey] = linkedKeys;
                delete(payload[child.payloadKey]);
            }
        }
    }

    async saveChildItem(child:ChildData, childPayload, action:SaveAction){
        const referenceField = child.linkedKey;
        const indexVal = childPayload[referenceField];
        childPayload = getPayloadForPath(this.request, child.path+'/'+action, childPayload);
        if(Object.keys(childPayload).length){
            const {response} = await child.modelInstance._addedit(childPayload, action, [referenceField]);
            return response[referenceField];
        }else{
            return indexVal;
        }
    }

    async _delete(params:Record<string, unknown>, hard = false){
        if(hard){
            return await this._hardDelete(params);
        }
        return await this._softDelete(params);
    }

    async _hardDelete(params:Record<string, unknown>){
        const responseFields = await this.getResponseFields();
        return await hardDeleteItem(this.tableName, params, responseFields);
    }

    async _softDelete(whereParams:Record<string, unknown>){
        const responseFields = await this.getResponseFields();
        const updateParams:any = {deleted:1};
        if(this.hasMetadataField('deleted_at')){
            updateParams.deleted_at = getNow();
        }
        return await update(this.tableName, updateParams, whereParams, responseFields);
    }

    getChildModelInstance(child:ChildRelation): AbstractDbModel{
        return new (child.model)(this.request);
    }
}