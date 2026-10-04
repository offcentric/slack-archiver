import {db} from '../db/knex';

export interface SearchFilters {
    workspace?: string[];
    channel?: string;
    user?: string;
}

export const buildSearchQuery = (
    tableName: string,
    searchFields: string[],
    searchStr: string,
    limit = 20,
    page = 1,
    filters?: SearchFilters,
) => {
    if (!searchFields || !searchFields.length) {
        throw new Error('no_searchfields_specified');
    }

    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const safePage = Math.max(Number(page) || 1, 1);
    const searchFieldsString = searchFields.join(" || ' ' || ");
    const where = [`to_tsvector('english', ${searchFieldsString}) @@ plainto_tsquery(?)`];
    const whereBindings: unknown[] = [searchStr];

    if (filters?.workspace?.length) {
        where.push('"workspace" = ANY(?::varchar[])');
        whereBindings.push(filters.workspace);
    }
    if (filters?.channel) {
        where.push('"channel" = ?');
        whereBindings.push(filters.channel);
    }
    if (filters?.user) {
        where.push('"user" = ?');
        whereBindings.push(filters.user);
    }

    const sql = `SELECT *,
             ts_rank_cd(to_tsvector('english', ${searchFieldsString} ), plainto_tsquery(?)) AS rank
              FROM "${tableName}"
              WHERE ${where.join(' AND ')}
              ORDER BY "datetime" DESC, "ts" DESC
              LIMIT ? OFFSET ?`;

    return {
        sql,
        bindings: [searchStr, ...whereBindings, safeLimit, safeLimit * (safePage - 1)],
    };
};

export const searchReturnsNothing = (filters?: SearchFilters): boolean => {
    return !!filters && Array.isArray(filters.workspace) && filters.workspace.length === 0;
};

export const search = async (
    tableName: string,
    searchFields: string[],
    searchStr: string,
    limit: number = 20,
    page: number = 1,
    filters?: SearchFilters,
) => {
    if (searchReturnsNothing(filters)) {
        return [];
    }
    const {sql, bindings} = buildSearchQuery(tableName, searchFields, searchStr, limit, page, filters);
    try {
        const ret = await db.raw(sql, bindings);
        return ret.rows;
    } catch (e) {
        console.error('Error executing search query:', e);
        throw new Error('search_query_failed');
    }
};
