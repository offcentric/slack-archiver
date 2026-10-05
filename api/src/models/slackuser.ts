import GenericModel from "models/_genericModel";
import {Request} from "express";
import {SavePayload} from "payload/_abstract";
import Metadata from "interfaces/_metadata";
import {WorkspaceIdentity} from "interfaces/user";
import {db} from "db/knex";
import Exception from "models/exception";
import {status} from "helpers/status";
import {isIgnoredSlackUser} from "helpers/slackIgnore";

export function slackUserSaveRow(payload: SavePayload, workspace: string) {
    return {
        uid: payload.uid || payload.id,
        workspace,
        team_id: payload.team_id ?? null,
        name: payload.name ?? null,
        real_name: payload.real_name ?? payload.profile?.real_name ?? null,
        is_bot: Boolean(payload.is_bot),
    };
}

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
        const members = Array.isArray(usersResponse?.members) ? usersResponse.members : [];
        let saved = 0;
        for (const user of members) {
            if (isIgnoredSlackUser(workspace, user?.id)) {
                continue;
            }
            await this.save(user, workspace);
            saved += 1;
        }
        return saved;
    }

    prepareSavePayload(payload: SavePayload) {
        return slackUserSaveRow(payload, this.workspace);
    }

    async save(payload, workspace) {
        this.workspace = workspace;
        const row = this.prepareSavePayload(payload);
        if (!row.uid) {
            throw new Exception('missing_slack_user_id', status.bad);
        }
        const [saved] = await db(this.tableName)
            .insert(row)
            .onConflict('uid')
            .merge(['workspace', 'team_id', 'name', 'real_name', 'is_bot'])
            .returning(['id', 'uid']);
        return saved;
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
