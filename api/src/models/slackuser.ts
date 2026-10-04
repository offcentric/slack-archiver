import GenericModel from "models/_genericModel";
import {Request} from "express";
import {SavePayload} from "payload/_abstract";
import Metadata from "interfaces/_metadata";
import {WorkspaceIdentity} from "interfaces/user";
import {db} from "db/knex";

const metadata:Array<Metadata> = [
    {
        key:"id",
        type : "integer",
        sortable_key: 'id',
        show_in_list : true,
    },
    {
        key:"uid",
        type : "string",
        sortable_key: 'path',
        show_in_list : true,
    },
    {
        key:"workspace",
        type : "string",
        show_in_list : true,
    },
    {
        key:"name",
        type : "string",
        show_in_list : true,
    },
    {
        key:"real_name",
        type : "string",
        show_in_list : true,
    },
    {
        key:"is_bot",
        type : "boolean",
        show_in_list : true,
    },
    {
        key:"user_id",
        type : "integer",
        hidden: true,
        show_in_list : false,
    },
];

export class Slackuser extends GenericModel {
    indexField = 'id';
    messageCount = 0;
    listAll = true;
    orderBy = 'name';

    constructor(req: Request) {
        super('slackuser', {metadata}, req);
    }

    async saveBatch(usersResponse, workspace) {
        for(let user of usersResponse.members) {
            console.log("USER", user);
            // console.log("PROFILE", user.profile);
        await this.save(user, workspace);
    }
}

    prepareSavePayload(payload:SavePayload){
        return {...payload, uid:payload.id, workspace: this.workspace};
    }

    async save(payload, workspace) {
        this.workspace = workspace;
        console.log("SAVE USER", payload);
        return await this._addedit(payload, 'add', ['uid']);
    }

    async findIdentitiesForUserId(userId: number): Promise<WorkspaceIdentity[]> {
        if (!userId) {
            return [];
        }

        const rows = await db(this.tableName)
            .where('user_id', userId)
            .orderBy('workspace')
            .select('id', 'uid', 'workspace', 'name', 'real_name', 'is_bot');

        return rows.map((row) => ({
            id: row.id,
            uid: row.uid ?? null,
            workspace: row.workspace,
            name: row.name ?? null,
            real_name: row.real_name ?? null,
            is_bot: row.is_bot ?? null,
        }));
    }
}
