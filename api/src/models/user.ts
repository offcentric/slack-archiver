import GenericModel from "models/_genericModel";
import {Request} from "express";
import Metadata from "interfaces/_metadata";
import {getWorkspaceNames, UserResponse, WorkspaceIdentity} from "interfaces/user";
import {set as setCache, get as getCache } from "helpers/cache";
import {clearSessionStore} from "helpers/auth";
import Exception from "models/exception";
import {sendMail} from "helpers/mail";
import {Slackuser} from "models/slackuser";
import {Message} from "models/message";

const metadata:Array<Metadata> = [
    {
        key:"id",
        type : "integer",
        sortable_key: 'id',
        show_in_list : true,
    },
    {
        key:"email",
        type : "string",
        sortable_key: 'path',
        show_in_list : true,
    },
    {
        key:"role",
        type : "integer",
        show_in_list : true,
    },
    {
        key:"workspaces",
        type : "array",
        itemtype: "string",
        show_in_list : true,
    }
];


export class User extends GenericModel {
    indexField = 'id';

    constructor(req: Request) {
        super('user', {metadata}, req);
    }


    async enrichUserResponse(userData: Record<string, any>): Promise<UserResponse> {
        const names = getWorkspaceNames(userData.workspaces);
        const linked = userData.id
            ? await (new Slackuser(this.request)).findIdentitiesForUserId(userData.id)
            : [];
        const byWorkspace = new Map(linked.map((item) => [item.workspace, item]));
        const workspaces: WorkspaceIdentity[] = names.map((workspace) => {
            return byWorkspace.get(workspace) ?? {
                workspace,
                uid: null,
                name: null,
                real_name: null,
            };
        });
        const rest = {...userData};
        delete rest.name;
        delete rest.real_name;
        return {
            ...rest,
            workspaces,
        };
    }

    async getChannels(workspace: string, uid: string): Promise<string[]> {
        return await (new Message(this.request)).getChannelsForUser(workspace, uid);
    }

    async authenticate(email:string, code:number):Promise<Record<string, any>> {
        if(Number.isNaN(code) || code < 100000 || code > 999999) {
            throw new Exception('invalid_code_format');
        }

        const userData = await this._get({email:email});
        const cacheKey = `auth_code_${email}`;
        if(!userData) {
            throw new Exception('user_not_found');
        }
        const cachedCode = parseInt(getCache(cacheKey));
        console.log("CACHED CODE 2", cacheKey, cachedCode, code);
        if(code !== cachedCode) {
            throw new Exception('invalid_code');
        }
        setCache(cacheKey, null);
        return userData;
    }

    async sendLoginCode(email:string) {
        const code = Math.floor(100000 + Math.random() * 899999).toString();
        if(!await this._get({email:email}, false)) {
            return true;
        }
        try{
            const cacheKey = `auth_code_${email}`;
            setCache(cacheKey, code, 60*5);
            console.log("CACHED CODE 1", cacheKey, getCache(cacheKey));
            await sendMail(email, 'Slack Archiver login code', `<p>Hi,</p><p>Your login code is: <strong>${code}</strong></p><p>It will be valid for 5 minutes.</p>`, "html");
        }catch(e){
            console.error(e);
            throw new Exception('failed_to_send_code', e);
        }
        return true;
    }

    async logout(req:Request) {
        const session = req.session;
        if(!session || !session.user) {
            throw new Error('no_session');
        }
        session.destroy();
        await clearSessionStore(req);
        return true;
    }
}
