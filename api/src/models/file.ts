import {getEnvConfig} from "helpers/config";
import fs  from 'fs';
import {getDateTime} from "helpers/date";
import {initSlack}  from 'providers/slack';
import GenericModel from "models/_genericModel";
import {Request} from "express";
import Metadata from "interfaces/_metadata";
import {SavePayload} from "payload/_abstract";

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
    indexField = 'id';
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

    async save(payload, workspace) {
        this.workspace = workspace;
        console.log("SAVE FILE", payload);
        return await this._addedit(payload, 'edit', ['uid','id']);
    }
}
