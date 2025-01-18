import {addedit} from "helpers/data";

export const saveBatch = async(usersResponse, workspace) => {

    for(let user of usersResponse.members) {
        console.log("USER", user);
        // console.log("PROFILE", user.profile);
        await saveUser(user, workspace);
    }
}

export const saveUser = async(user, workspace) => {
    return await addedit('user', {uid:user.id, workspace, team_id:user.team_id, name:user.name, real_name:user.real_name, is_bot:user.is_bot}, 'uid', 'add', ['uid'] );
}

