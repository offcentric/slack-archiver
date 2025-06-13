export default interface ErrorLogInterface{
    message:string,
    code:number,
    stacktrace?:string,
    filepath?:string,
    filename?:string,
    method?:string,
    line_number?:number,
    user_id?:number,
    params?:object,
    created_at?:string
}

