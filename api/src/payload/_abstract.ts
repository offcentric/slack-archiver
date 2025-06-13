export interface WhereParams{
    [key:string]: string|boolean|number|Record<string, any>
}

export interface SavePayload {
    uid?: string
    code?: string,
    name?: string,
    slug?: string,
    title?: string,
    [key:string]: any
}

export interface QueryPayload {
    [key:string]: any
}

