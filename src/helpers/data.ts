import {db} from '../db/knex';
import {errorMessage, status} from '../helpers/status';
import {set as setCache, get as getCache, del as deleteCache, getCacheKey} from '../helpers/cache';
import Exception from '../models/exception';

const dataMemoized = {};

export const get:any = async(tableName:string, params:any, key = "id", joins = [], responseFields = ['id'], cacheTtl:any = false, isAdm = false) => {
    const id = params[key];
    if(!id){
        throw new Exception('missing_'+key);
    }

    let ret = null;
    const cKey = getCacheKey("get", tableName, params, key, joins, responseFields);
    ret = await getCache(cKey);
    if(ret !== false){
        return ret;
    }
    const send = async () => {
        const qb = db(tableName);
        let columnName = key;
        if(columnName.indexOf('.')===-1){
            columnName = tableName+'.'+columnName;
        }
        qb.where(columnName, id)
        addJoinsToQuery(qb, joins);
        // console.log("******** GET SQL ["+tableName+"] ***************", qb.select(responseFields).toString());
        const resp : Array<Response> = await qb.select(responseFields);
        if (resp[0] ===  undefined) {
            throw new Exception(tableName+'_not_found', status.notfound, params);
        }
        return resp[0];
    }
    ret = await send();
    if(cacheTtl !== false){
        await setCache(cKey, ret, cacheTtl);
    }
    return ret;
}

export const getBy = async(tableName:string, params, joins = [], throwIfMissing = true, responseFields = ['id'], cacheTtl:any = false, isAdm = false) => {
    if(!Object.keys(params)){
        throw new Exception('missing_keys');
    }
    if(!Object.values(params)){
        throw new Exception('missing_values');
    }

    const fieldnames = await getModelFieldnames(tableName, []);
    let ret:any = [];
    const cKey = getCacheKey("getBy", tableName, params, joins, responseFields);

    ret = await getCache(cKey);
    if(ret !== false){
        return ret;
    }

    const send = async () => {
        const filters = paramsToFilters(params);
        const qb = db(tableName);
        addFiltersToQuery(qb, filters, tableName)
        // Object.keys(params).forEach((key) => {
        //     if(fieldnames.indexOf(key) == -1){
        //         throw new Exception(key+'_field_does_not_exist_on_'+tableName);
        //     }
        //     let columnName = key;
        //     if(columnName.indexOf('.')===-1){
        //         columnName = tableName+'.'+columnName;
        //     }
        //     qb.andWhere(columnName, '=', params[key]);
        // });
        addJoinsToQuery(qb, joins);
        // console.log('QUERY '+tableName, params);
        // console.log("******** GET BY SQL ["+tableName+"] ***************", qb.select(responseFields).toString());
        const resp: Array<Response> = await qb.select(responseFields);
        // console.log('RESPONSE '+tableName, resp);
        if (resp[0] === undefined){
            if(throwIfMissing){
                throw new Exception(tableName+'_not_found', status.notfound, {params});
            }else{
                return null;
            }
        }
        return resp[0];
    }
    ret = await send();

    if(cacheTtl !== false){
        await setCache(cKey, ret, cacheTtl);
    }
    return ret;
}

export const getCollection = async (tableName:string, params:Record<string, any> = {}, responseFields = null, orderBy?:string|Array<string|Record<string, any>>, joins = [], limit:number|Array<number> = null, distinct = false, cacheTtl:any = false, isAdm = false) => {
    try{
        const cKey = getCacheKey("getCollection", tableName, params, responseFields, orderBy, joins, limit, distinct);

        if(cacheTtl === -1){
            await deleteCache(cKey);
        }
        let ret = await getCache(cKey);

        if(!isAdm && ret !== false){
            return ret;
        }

        const send = async () => {
            const filters = paramsToFilters(params, joins);
            const qb = db(tableName);
            addFiltersToQuery(qb, filters, tableName)
            addJoinsToQuery(qb, joins);
            if(orderBy){
                if(Array.isArray(orderBy)){
                    if(typeof orderBy[0] === 'string' && typeof orderBy[1] === 'string' ){
                        qb.orderBy(orderBy[0], orderBy[1]);
                    }else{
                        for(var x=0; x<orderBy.length; x++){
                            const el = orderBy[x];
                            if(typeof el === 'string'){
                                qb.orderBy(el);
                            }else{
                                qb.orderBy(el[0], el[1]);
                            }
                        }
                    }
                }else{
                    qb.orderBy(orderBy);
                }
            }
            if(limit){
                if(Array.isArray(limit)){
                    if(limit.length === 2){
                        qb.limit(limit[0]);
                        qb.offset(limit[1])
                    }
                }else{
                    qb.limit(limit);
                }
            }
            // console.log("************************* COLLECTION PAYLOAD ["+tableName+"] **************************", params);
            // console.log("************************* COLLECTION PARAMS ["+tableName+"] **************************", filters);
            // console.log("************************* COLLECTION RESPONSE ["+responseFields+"] **************************", filters);
            // console.log("****** COLLECTION SQL ***************", qb.select(responseFields).toString());
            // const keyData = qb.select().toString()+responseFields.toString()+!!distinct;
            // let ret = null;
            // ret = await getMemoizedData(keyData);
            // if(ret !== false){
            //     return ret;
            // }
            // const ret = await qb.select(responseFields).orderBy(orderBy);
            if(distinct){
                ret = await qb.distinct(responseFields);
            }else{
                ret = await qb.select(responseFields);
            }
            // console.log("ITEMS FOR "+tableName, ret);
            // memoizeData(keyData, ret);
            return ret || [];
        }
        ret = await send();
        if(cacheTtl === -1){
            await deleteCache(cKey);
        }else if(cacheTtl !== false){
            await setCache(cKey, ret, cacheTtl);
        }
        return ret;
    }catch (error){
        console.error("error", error);
        throw new Exception('unable_to_get_'+tableName+': '+error.detail, 500, errorMessage);
    }
}

export const addedit = async(tableName:string, params:any, indexField = 'id', action = 'add', responseFields = ['id']) => {

    const send : any = async () => {

        const checkparams = {...params};
        delete checkparams[indexField];
        if(!Object.keys(checkparams).length){
            throw new Exception('no_payload');
        }

        // console.log("ACTION", action, indexField);
        if(action === 'edit' && !params[indexField]){
            throw new Exception('edit_missing_index_for_'+tableName, status.error);
        }

        let resp:any = await db.transaction((t) => {
            const whereParams = [];
            whereParams[indexField] = params[indexField];
            const st = t(tableName).returning(responseFields);
            if(indexField){
                st.onConflict([indexField]).merge();
            }
// console.log("****** ADD SQL PARAMS ***************", params);
// console.log("****** ADD SQL ***************", st.insert(params).toString());
            return st.insert(params);
        });
        // console.log("RAW RESPONSE", resp);
        if(resp.command === 'INSERT' && resp.rowCount){
            return true;
        }
        if(resp.length && resp[0][indexField]){
            return resp[0];
        }
        if(IsNumeric(resp[0])){
            return resp[0];
        }
        if(resp[0] === undefined) {
            throw new Exception(tableName+'_not_found', status.notfound);
        }
        throw new Exception('unable_to_'+action+'_'+tableName, status.error, resp);
    }
    try{
        return await send();
    }catch(error){
        console.error("ADDEDIT ERROR", error);
        if(alreadyExists(error.detail)){
            throw new Exception('unique_key_violation', status.conflict, error.detail);
        }
        if(error.detail){
            throw new Exception(error.detail);
        }

        let detail = error.message;

        if(error instanceof Exception){
            throw error;
        }
        throw new Exception('database_error_with_'+action, status.error, detail);
    }
}

export const upsert = async(tableName:string, updateParams:any, whereParams:any, responseFields = ['id']) => {
    const send : any = async () => {
        const params = {...updateParams, ...whereParams};
        const resp:any = await db.transaction((t) => {
// console.log("****** UPSERT SQL ***************", t(tableName).insert(params).onConflict(Object.keys(whereParams)).merge().returning(responseFields).toString());
            return t(tableName).insert(params).onConflict(Object.keys(whereParams)).merge().returning(responseFields);
        });
        if(resp.command === 'INSERT' && resp.rowCount){
            return true;
        }
        return resp;
    }
    try{
        return await send();
    }catch(error){
        // throw new Exception(error);
        if(error.detail){
            throw new Exception(error.detail);
        }
        throw new Exception('database_upsert_exception',status.error, error);
    }
}

export const update = async(tableName:string, updateParams:any, whereParams:any, responseFields = ['id']) => {
    const send : any = async () => {
        return await db.transaction(async (t) => {
            // console.log("****** UPDATE SQL ***************", t(tableName).update(updateParams).where(whereParams).returning(responseFields).toString());
            return await t.update(updateParams).into(tableName).where(whereParams).returning(responseFields);
        });
    }

    try{
        return await send();
    }catch(error){
        // throw new Exception(error);
        if(error.detail){
            throw new Exception(error.detail);
        }
        throw new Exception('database_update_exception',status.error, error);
    }
}

export const softDeleteItem = async(tableName:string, params:any, responseFields = ['id']) => {
    return await update(tableName, {deleted:1}, params, responseFields);
}

export const hardDeleteItem = async(tableName:string, params:any, responseFields = ['id']) => {
    const send:any = async () => {
        const resp:any = await db.transaction((t) => {
            const filters = paramsToFilters(params);
            const qb = t(tableName);
            addFiltersToQuery(qb, filters, tableName)
            console.log("****** DELETE SQL ***************", qb.delete(responseFields).toString());
            return qb.delete(responseFields);
        });
    }

    try{
        return await send();
    }catch(error){
        if(error.detail){
            throw new Exception(error.detail);
        }
        throw new Exception('database_delete_exception',status.error, error);
    }
}

export const getModelFields = async(tableName:string, modelFields) => {
    if(modelFields.length)
        return modelFields;
    try{
        const send = async () => {
            const resp : Array<Response> = await db('information_schema.columns').select(['column_name', 'data_type','is_nullable','column_default']).where('table_schema','public').where('table_name',tableName);
            resp.forEach((el, i) => {
                modelFields.push(el);
            })
            return modelFields;
        }
        return await send();
    }catch (error){
        throw new Exception('unable_to_get_'+tableName+': '+error.detail, 500, errorMessage);
    }
}

export const getModelFieldnames = async(tableName:string, modelFields) => {
    const fieldNames = [];
    const fields = await getModelFields(tableName, modelFields);
    fields.map((el) => {
        fieldNames.push(el['column_name']);
    });
    return fieldNames;
}

export const paramsToFilters = (params, joins?) => {
    const filters = [];
    Object.keys(params).forEach(key => {
        // console.log("PARAMS", params);
        let val = params[key];
        if(Array.isArray(val)) {
            filters.push({key, comp: 'in', val});
        }else if(val === null){
            filters.push({key, comp: 'is', val});
        }else if(typeof val == 'object'){
            Object.keys(val).forEach(subkey => {
                if(subkey === '__value'){
                    const value = val['__value'];
                    const joinTable = val['__joinTable'];
                    const relationType = val['__relationType'];
                    const joinField = val['__relationType'] === 'many' ? 'ANY('+joinTable+'_codes)' : joinTable+'_code';
                    key = joinTable+'.'+Object.keys(value)[0];
                    if(joins){
                        joins.push({table:joinTable, first:joinTable+'.code', second:joinField});
                    }
                    filters.push({key,comp:'=',val:Object.values(value)[0]});
                }else if(['is','is not','like','any','>','<','>=','<=','<>', '!='].indexOf(subkey) !== -1){
                    filters.push({key,comp:subkey,val:val[subkey]});
                }else if(['__joinTable','__relationType'].indexOf(subkey) === -1){
                    filters.push({key:subkey,comp:'=',val:val[subkey]});
                }
            })
        }else{
            filters.push({key,comp:'=',val});
        }
    });
    // console.log("FILTERS OUT", filters);
    return filters;
}

export const addFiltersToQuery = (qb, filters, tableName) => {
    if(filters.length){
        filters.forEach((el) => {
            if(el.comp.toLowerCase() == 'in'){
                qb.andWhere(el.key, 'in', el.val);
            }else if(el.comp.toLowerCase() === 'is'){
                qb.andWhereRaw(el.key + ' ' + el.comp + ' ' + el.val);
            }else if(el.comp == 'any'){
                if(Array.isArray(el.val)){
                    qb.andWhereRaw('"'+el.key+'" = ANY(array[\''+el.val.join('\',\'')+'\'])');
                }else{
                    let columnName = el.key;
                    if(columnName.indexOf('.')!==-1){
                        const parts = columnName.split('.');
                        tableName = parts[0];
                        columnName = parts[1];
                    }
                    columnName = '"'+tableName+"\".\""+columnName+'"';
                    qb.andWhereRaw("'"+el.val+"' = ANY("+columnName+")");
                }
            }else{
                // console.log("FILTER", el);
                let columnName = el.key;
                if(columnName.indexOf('array_length') !==-1){
                    qb.andWhereRaw(columnName+el.comp+el.val);
                }else if(el.val === 'NOW()'){
                    qb.andWhereRaw(columnName+el.comp+el.val);
                }else{
                    if(columnName.indexOf('.')===-1){
                        columnName = tableName+'.'+columnName;
                    }
                    qb.andWhere(columnName, el.comp, el.val);
                }
            }
        });
    }

}

export const addJoinsToQuery = (qb, joins) => {
    if(joins.length){
        joins.forEach((el) => {
            qb.joinRaw('left join "'+el.table+'" '+(el.as?'"'+el.as+'"':'')+' on '+el.first+'='+el.second);
            if(el.outfield){
                //responseFields.push(el.outfield);
            }
        })
    }
}

export const getHoursDiff = (date1, date2) => {
    return "DATE_PART('day', "+date2+"::timestamp - "+date1+"::timestamp) * 24 + DATE_PART('hour', "+date2+"::timestamp - "+date1+"::timestamp)";
}

export const alreadyExists = (response) => {
    // console.log("Response", response);
    return response && response.match(/Key \([^)]+\)=\([^)]+\) already exists\./);
}

const IsNumeric = (val) => {
    return Number(parseFloat(val)) == val;
}
