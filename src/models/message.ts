import { Request } from 'express';
import Metadata from '../interfaces/_metadata';
import {getDateTime} from "../helpers/date";
import {Attachment} from "../models/attachment";
import {File} from "../models/file";
import {Block} from "../models/block";
import Exception from "../models/exception";
import {initSlack}  from '../providers/slack';
import GenericModel from "models/_genericModel";
import {SavePayload} from "payload/_abstract";


const metadata:Array<Metadata> = [
    {
        key:"id",
        type : "integer",
        sortable_key: 'id',
        show_in_list : true,
    },
    {
        key:"client_msg_id",
        type : "string",
        sortable_key: 'path',
        show_in_list : true,
    },
    {
        key:"reply_to",
        type : "string",
        show_in_list : true,
    },
    {
        key:"user",
        type : "string",
        show_in_list : true,
    },
    {
        key:"ts",
        type : "integer",
        show_in_list : true,
    },
    {
        key:"datetime",
        type : "datetime",
        show_in_list : true,
    },
    {
        key:"workspace",
        type : "string",
        show_in_list : true,
    },
    {
        key:"channel",
        type : "string",
        show_in_list : true,
    },
    {
        key:"team",
        type : "string",
        show_in_list : false,
    },
    {
        key:"type",
        type : "string",
        show_in_list : false,
    },
    {
        key:"text",
        type : "richtext",
        show_in_list : true,
    },
    {
        key:"file_ids",
        type : "array",
        show_in_list : true,
    },
    {
        key:"attachment_ids",
        type : "array",
        show_in_list : true,
    },
    {
        key:"block_ids",
        type : "array",
        show_in_list : true,
    },
];

export class Message extends GenericModel{
    indexField = 'ts';
    messageCount = 0;
    orderBy = ['ts', 'desc'];
    listAll = true;

    constructor(req:Request){
        super('message', {metadata}, req);
    }

    async getForChannel (workspace, channelName?:string, latest?:number, limit?:number, doSave = false) {

        let ret = [];
        let resp:any = {messages:[], has_more:true};
        let cursor = null;
        const slack = initSlack(workspace);

        do{
            resp = await slack.getMessagesBatch(channelName, cursor, latest, limit);
            console.log("LOADED "+resp.messages.length+" MESSAGES");
            if(!resp.messages.length){
            break;
        }

        const lastMessage = resp.messages[resp.messages.length-1];
        // console.log("LAST MESSAGE",lastMessage, getDateTime(lastMessage.ts));
        await this.processBatch(resp, channelName, workspace, doSave)
        ret = ret.concat(resp.messages);
        cursor = resp.response_metadata.next_cursor;
        console.log("NEXT CURSOR", cursor);
        }while (resp.has_more === true && limit === null)

            console.log("TOTAL MESSAGE COUNT", this.messageCount);
        // console.log("MESSAGES FROM SLACK API", ret);
        return ret;
    }

    async save (message, workspace, channelName, parentId?) {
        // console.log("MESSAGE", message);
        const attachment = new Attachment(this.request);
        const block = new Block(this.request);
        const file = new File(this.request);

        if(message.subtype === 'message_deleted'){
            this.responseFields = ['block_ids', 'file_ids', 'attachment_ids'];
            const messageData = await this._get({ts:message.deleted_ts}, false);

            if(!messageData){
                throw new Exception('message_not_found');
            }
            // console.log("SAVED MESSAGE", messageData);
            if(messageData.block_ids.length){
                await block._delete({id:messageData.block_ids}, true);
            }
            if(messageData.file_ids.length){
                await file._delete({id:messageData.file_ids}, true);
            }
            if(messageData.attachment_ids.length){
                await attachment._delete({id:messageData.attachment_ids}, true);
            }
            await this._delete({id:messageData.deleted_ts}, true);
        }

        const payload = {
            user: message.user,
            client_msg_id: message.client_msg_id,
            datetime: getDateTime(message.ts),
            ts: message.ts,
            type: message.type,
            channel: channelName,
            team: message.team,
            text: message.text,
            attachment_ids: {},
            file_ids: {},
            block_ids:{},
            reply_to:parentId
        };

        if (message.attachments) {
            // console.log("ATTACHMENTS", message.attachments);
            await attachment.saveBatch(payload, message.attachments, workspace)
        }

        if (message.files) {
            // console.log("FILES", message.files);
            await file.saveBatch(payload, message.files, workspace)
        }

        if (message.blocks) {
            // console.log("BLOCKS", message.blocks);
            await block.saveBatch(payload, message.blocks)
        }

        console.log("SAVING MESSAGE", payload);
        return await this._addedit({...payload, workspace}, 'add', ['id','ts']);
    }

    async processBatch(resp, channelName, workspace, doSave) {
        const slack = initSlack(workspace);
        for (const message of resp.messages) {

            // console.log("MESSAGE", message, getDateTime(message.ts));

            if(message.type !== 'message' && !message.client_msg_id && !message.files){
                console.log("SKIPPING", message);
                continue;
            }
            this.messageCount++;


            if(doSave) {
                await this.save(message, workspace, channelName)
            }else{
                console.log("MESSAGE LOADED", message);
            }

            if(message.reply_count){
                const replies = await slack.getRepliesForMessage(channelName, message.ts);
                for(let reply of replies.messages) {
                    if(reply.reply_count || !reply.client_msg_id){
                        continue;
                    }
                    this.messageCount++;

                    // console.log("REPLY", reply.text, getDateTime(reply.ts));

                    if(doSave) {
                        await this.save(reply, workspace, channelName, message.ts)
                    }
                }
            }
        }
    }
}

