import AbstractDbModel from "../models/_abstractDbModel";

export default interface Metadata{
    title?: string,
    key:string,
    type : "string" | "integer" | "float" | "boolean" | "richtext" | "email" | "password" | "datetime" | "timestamp" | "currency" | "lookup" | "array" | "object" | "list" | "location" | "assetdata" | "asseturl",
    itemtype?: "string" | "integer" | "assetdata" | "asseturl" ,
    assetdata?: AssetData,
    showCaption?:boolean,
    child_relation?: ChildRelation,
    formtype? : "text" | "number" | "checkbox" | "select" | "markdown" | "hidden" | "email" | "datetime" | "list" | "file" | "filelist" | "custom",
    options?:Array<{name:string,value:string}>,
    required? : boolean,
    regexp? : string,
    allow_wildcards? : boolean,
    hidden? :boolean,
    show_in_list? : boolean,
    show_in_list_adm? : boolean,
    list_subitems? : Array<string>,
    response_only?: boolean,
    derived_value?: boolean,
    admin_only? : boolean,
    onchange? : string,
    sync?: "to" | "from" | "both"
    sortable_key?: string,
    searchable?: boolean
}

export interface ChildRelation{
    save_payload_key? : string, // name of the field in save payload that contains the children
    model? : typeof AbstractDbModel,
    modelname?: string,
    table_name?: string, // equals model.tableName, but we cannot instantiate child model to retrieve that because of risk of circular reference
    path? : string,
    linked_key? : string, // which field in the child model to return to parent when doing recursive save, defaults to code
    output_key? : string, // name for the key to hold the child values, also the name of the field in Contentful
    return_key? : boolean, // wether to just return linked_key to parent or to recurse further
    outfield? : string, //  name of the field to return from a join
    show_in_list? : boolean,
    for_join? : boolean,
}

interface AssetData{
    fileType:'xml'|'png'|'jpg'|'pdf';
}
