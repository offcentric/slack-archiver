export interface UserResponse {
    id?: number,
    email?: string,
    workspaces:string[],
}

export interface UserSession extends UserResponse{
    session_id?:string,
}
