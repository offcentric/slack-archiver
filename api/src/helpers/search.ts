import {db} from '../db/knex';

export const search = async (tableName:string, searchFields:string[], searchStr:string, limit:number = 20, page:number = 0) => {
    if(!searchFields || !searchFields.length) {
        throw new Error("no_searchfields_specified");
    }

    const searchFieldsString = searchFields.join(" || ' ' || ");
    const query = `SELECT *,
             ts_rank_cd(to_tsvector('english', ${searchFieldsString} ), plainto_tsquery(?)) AS rank
              FROM "${tableName}"
              WHERE to_tsvector('english', ${searchFieldsString}) @@ plainto_tsquery(?)
              ORDER BY rank DESC
              LIMIT ? OFFSET ?`;

    console.log("SEARCH QUERY", db.raw(query, [searchStr, searchStr, limit, limit*(page-1)]).toString());
    try{
        const ret = await db.raw(query, [searchStr, searchStr, limit, limit*(page-1)]);
        return ret.rows;
    }catch (e){
        console.error("Error executing search query:", e);
        throw new Error("search_query_failed");
    }
}