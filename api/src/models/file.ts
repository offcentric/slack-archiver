import {getEnvConfig} from "helpers/config";
import fs  from 'fs';
import {getDateTime} from "helpers/date";
import {initSlack}  from 'providers/slack';
import GenericModel from "models/_genericModel";
import {Request} from "express";
import Metadata from "interfaces/_metadata";
import {SavePayload} from "payload/_abstract";
import {db} from '../db/knex';
import {FILE_SORT_COLUMNS, sanitizeOrderBy} from '../helpers/archiveQuery';

const VISUAL_FILETYPES = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'webm', 'avi', 'mkv'];

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
        key:"created_at",
        type : "datetime",
        show_in_list : true,
    },
    {
        key:"name",
        type : "string",
        show_in_list : true,
    },
    {
        key:"title",
        type : "string",
        show_in_list : true,
    },
    {
        key:"mimetype",
        type : "string",
        show_in_list : false,
    },
    {
        key:"filetype",
        type : "string",
        show_in_list : true,
    },
    {
        key:"user",
        type : "string",
        show_in_list : true,
    },
    {
        key:"workspace",
        type : "string",
        show_in_list : true,
    },
    {
        key:"url",
        type : "string",
        show_in_list : true,
    },
    {
        key:"thumbnail",
        type : "string",
        show_in_list : true,
    },
    {
        key:"savepath",
        type : "string",
        show_in_list : true,
    },
];

export class File extends GenericModel {
    indexField = 'uid';
    messageCount = 0;
    listAll = true;
    constructor(req: Request) {
        super('file', {metadata}, req);
    }

    async saveBatch(payload:any, files:Array<any>, workspace) {

        const fileIds = [];
        for(let file of files){
            // console.log("SAVING FILE", file);
            await this.download(file, payload.channel, workspace);
            const resp = await this.save(file, workspace);
            // console.log("FILE SAVED", resp);
            if(typeof resp.response === "object"){
                fileIds.push(resp.response.id);
            }else{
                fileIds.push(resp.response+'');
            }

        }
        if(fileIds.length){
            payload.file_ids = fileIds;
        }
    }

    async getByUid(uid:string, workspace, doSave = false, channelName?) {
        const slack = initSlack(workspace);
        const {file} = await slack.getFile(uid);
        if(doSave){
            const channelId = file.channels[0];
            if(!channelName){
                channelName = await slack.getChannelName(channelId);
            }
            await this.download(file, channelName, workspace)
            await this.save(file, workspace);
        }
    }

    async download(file, channelName, workspace){
        const slack = initSlack(workspace);
        const userToken = slack.getUserToken()

        let response;
        const options =  {
            method: "GET",
            headers: {Authorization: "Bearer "+userToken}
        };

        if(['mp4','mov','avi','mkv'].includes(file.filetype)){
            const maxDownloadSizeKb = getEnvConfig('MAX_DOWNLOAD_FILE_SIZE_KB', 50000);
            if(parseInt(file.size) > maxDownloadSizeKb*1000) {
                console.log("VIDEO FILE EXCEEDS MAX DOWNLOAD SIZE OF "+maxDownloadSizeKb+'KB, CANNOT DOWNLOAD');
                return;
            }
        }
        let downloadUrl;
        //console.log("DOWNLOAD FILE START", file);
        if(file.mp4){
            downloadUrl = file.mp4;
        }else if(file.thumb_1024){
            downloadUrl = file.thumb_1024;
        }else if(file.url_private && file.url_private.indexOf('dropbox.com') === -1){
            downloadUrl = file.url_private;
        }else if(file.thumb_800){
            downloadUrl = file.thumb_800;
        }else if(file.thumb_720){
            downloadUrl = file.thumb_720;
        }else if(file.thumb_480){
            downloadUrl = file.thumb_480;
        }else if(file.thumb_360){
            downloadUrl = file.thumb_360;
        }else if(file.thumb_160){
            downloadUrl = file.thumb_160;
        }

        if(!downloadUrl){
            return;
        }

        response = await fetch(downloadUrl, options);
        // response = await fetch('https://i.redd.it/n9w3al69rcbe1.jpeg');
        const blob = await response.blob();
        const arrayBuffer = await blob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const fileName = file.title.replace(/^https?:\/\//, '').replaceAll('/','-')+'--'+file.id+'.'+file.filetype;
        const downloadDir = getEnvConfig('FILES_DOWNLOAD_DIRECTORY', '../files') + '/' + workspace;

        if(!fs.existsSync(downloadDir)){
            fs.mkdirSync(downloadDir);
        }
        if(!fs.existsSync(downloadDir+'/'+channelName)){
            fs.mkdirSync(downloadDir+'/'+channelName);
        }
        file.savepath = downloadDir+'/'+channelName+'/'+fileName;
        // console.log("DOWNLOAD FILE", file);
        fs.writeFileSync(file.savepath, buffer);
    }

    prepareSavePayload(payload:SavePayload){
        return {uid: payload.id, created_at:getDateTime(payload.timestamp), name:payload.name, title:payload.title, mimetype:payload.mimetype, filetype:payload.filetype, user:payload.user, workspace:this.workspace, url:payload.url_private, thumbnail:payload.thumb_360, savepath:payload.savepath};
    }

    async listMedia(filters: Record<string, any>, orderBy?: unknown, limit?: number | Array<number | null>) {
        const workspaces = Array.isArray(filters.workspace) ? filters.workspace.filter(Boolean) : [];
        if (!workspaces.length) {
            return {items: [], totalitems: 0, totalpages: 0, page: 1};
        }

        const apply = (qb) => {
            qb.whereIn('file.workspace', workspaces);
            qb.where(function () {
                this.where('file.mimetype', 'ilike', 'image/%')
                    .orWhere('file.mimetype', 'ilike', 'video/%')
                    .orWhereIn('file.filetype', VISUAL_FILETYPES);
            });
            if (filters.user) {
                qb.andWhere('file.user', filters.user);
            }
            if (filters.channel) {
                qb.whereExists(function () {
                    this.select(db.raw('1'))
                        .from('message')
                        .whereRaw('file.id = ANY(message.file_ids)')
                        .andWhere('message.channel', filters.channel)
                        .whereIn('message.workspace', workspaces);
                });
            }
            if (Array.isArray(filters.created_at)) {
                for (const clause of filters.created_at) {
                    const op = Object.keys(clause)[0];
                    qb.andWhere('file.created_at', op, clause[op]);
                }
            }
        };

        const countRows = await db('file').modify(apply).count('* as count');
        const total = parseInt(String(countRows[0]?.count ?? 0), 10);
        const pageSize = Array.isArray(limit) ? limit[0] : limit;
        const offset = Array.isArray(limit) && limit[1] ? Number(limit[1]) : 0;
        const [column, direction] = sanitizeOrderBy(orderBy, FILE_SORT_COLUMNS, ['created_at', 'desc']);

        let rowsQuery = db('file')
            .leftJoin('slackuser', function () {
                this.on('slackuser.uid', '=', 'file.user').andOn('slackuser.workspace', '=', 'file.workspace');
            })
            .modify(apply)
            .select(
                'file.id',
                'file.uid',
                'file.created_at',
                'file.name',
                'file.title',
                'file.mimetype',
                'file.filetype',
                'file.user',
                'file.workspace',
                'slackuser.real_name as real_name',
                'slackuser.name as slack_name',
            )
            .orderBy(`file.${column}`, direction);

        if (pageSize) {
            rowsQuery = rowsQuery.limit(Number(pageSize));
        }
        if (offset) {
            rowsQuery = rowsQuery.offset(offset);
        }

        const items = await rowsQuery;
        const size = pageSize ? Number(pageSize) : total || 1;
        return {
            items,
            totalitems: total,
            totalpages: total ? Math.ceil(total / size) : 0,
            page: pageSize ? Math.floor(offset / Number(pageSize)) + 1 : 1,
        };
    }

    async findSourceMessage(fileId: number, workspace: string): Promise<{ts: string; channel: string | null} | null> {
        const row = await db('message')
            .where('workspace', workspace)
            .whereRaw('? = ANY(file_ids)', [fileId])
            .orderBy('datetime', 'asc')
            .first('ts', 'channel');
        if (!row?.ts) {
            return null;
        }
        return {ts: row.ts, channel: row.channel || null};
    }

    async findOwner(uid: string | null | undefined, workspace: string): Promise<{real_name: string | null; slack_name: string | null}> {
        if (!uid) {
            return {real_name: null, slack_name: null};
        }
        const row = await db('slackuser').where({uid, workspace}).first('real_name', 'name');
        return {
            real_name: row?.real_name || null,
            slack_name: row?.name || null,
        };
    }

    async save(payload, workspace) {
        this.workspace = workspace;
        // console.log("SAVE FILE", payload);
        return await this._addedit(payload, 'edit', ['uid','id']);
    }
}
