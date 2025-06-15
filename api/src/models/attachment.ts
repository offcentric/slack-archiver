import {addedit, getBy, getCollection, hardDeleteItem} from "helpers/data";
import {Message} from "../models/message";
import {initSlack}  from 'providers/slack';
import {Block} from "models/block";
import GenericModel from "models/_genericModel";
import {Request} from "express";
import Metadata from "interfaces/_metadata";

const metadata:Array<Metadata> = [
    {
        key:"id",
        type : "integer",
        sortable_key: 'id',
        show_in_list : true,
    },
    {
        key:"from_url",
        type : "string",
        show_in_list : true,
    },
    {
        key:"image_url",
        type : "string",
        show_in_list : true,
    },
    {
        key:"title",
        type : "string",
        show_in_list : true,
    },
    {
        key:"ts",
        type : "integer",
        show_in_list : true,
    },
    {
        key:"channel",
        type : "string",
        show_in_list : true,
    },
    {
        key:"workspace",
        type : "string",
        show_in_list : true,
    },
    {
        key:"text",
        type : "richtext",
        show_in_list : true,
    },
    {
        key:"pretext",
        type : "richtext",
        show_in_list : true,
    },
    {
        key:"block_ids",
        type : "array",
        child_relation:{for_join: true, output_key: "blocks", model: Block, show_in_list: true},
        show_in_list : true,
    },
];

export class Attachment extends GenericModel {
    indexField = 'id';
    messageCount = 0;

    constructor(req: Request) {
        super('attachment', {metadata}, req);
    }

    async saveBatch(payload:any, attachments:Array<any>, workspace){
        const list = await getCollection('attachment', {ts:payload.ts}, ['id']);
        if(list.length > 0){
            for(const item of list){
                // console.log("HARD DELETE", item);
                await hardDeleteItem('attachment', {id:item.id})
            }
        }

        const attachmentIds = [];
        const block = new Block(this.request);
        for(let attachment of attachments){
            if(attachment.blocks){
                await block.saveBatch(payload, attachment.blocks)
            }
            const resp = await this.save(attachment, payload, workspace);
            // console.log("ATTACHMENT SAVED", resp);
            if(typeof resp === "object"){
                attachmentIds.push(resp.id);
            }else{
                attachmentIds.push(resp+'');
            }
        }
        if(attachmentIds.length){
            payload.attachment_ids = attachmentIds;
        }
    }

    async fix(workspace){
        const list = await getCollection('attachment', {from_url:null, image_url:null, block_ids:null});
        let currentWorkspace = workspace;
        let slack = initSlack(currentWorkspace);
        const messageModel = new Message(this.request);

        for(const attachment of list){
            // console.log("ATTACHMENT", attachment);
            const message = await getBy("message", {ts:{like: attachment.ts+'%'}}, [], false, ['id','ts','channel','workspace']);
            if(!message){
                continue;
            }
            // console.log("MESSAGE", message);

            if(message.workspace && message.workspace !== currentWorkspace){
                currentWorkspace = message.workspace;
                console.log("SWITCHING WORKSPACE", currentWorkspace)
                slack = initSlack(currentWorkspace);
            }

            const resp = await slack.getMessagesBatch(message.channel, null, null, message.ts);
            if(!resp.messages.length){
                continue;
            }
            const slackMessage = resp.messages[0];
            // console.log("SLACK MESSAGE", slackMessage);
            await messageModel.save(slackMessage, message.workspace, message.channel)
        }
    }

    async save(attachmentData, payload, workspace) {
        payload = {
            from_url: attachmentData.from_url,
            image_url: attachmentData.image_url,
            title: attachmentData.title,
            pretext: attachmentData.pretext,
            text: attachmentData.text,
            ts: payload.ts,
            channel: payload.channel,
            block_ids:payload.block_ids,
            workspace
        };
        console.log("SAVING ATTACHMENT", payload);
        return addedit('attachment', payload, this.indexField,'add', [this.indexField]);
    }
}

