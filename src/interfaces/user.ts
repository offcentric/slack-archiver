export interface UserResponse {
    id?: number,
    uid?: string,
    email?: string,
    team_id?:string,
    workspace?:string,
    name?:string,
}

export interface UserSession extends UserResponse{
    session_id?:string,
}
