import {addedit, getBy, getCollection, hardDeleteItem} from "helpers/data";
import {saveMessageData} from "./message";
import {getMessagesBatch, initSlack} from "providers/slack";
import {saveBlocks} from "models/block";

export const saveAttachments = async (payload:any, attachments:Array<any>, workspace) => {
    const list = await getCollection('attachment', {ts:payload.ts}, ['id']);
    if(list.length > 0){
        for(const item of list){
            // console.log("HARD DELETE", item);
            await hardDeleteItem('attachment', {id:item.id})
        }
    }

    const attachmentIds = [];
    for(let attachment of attachments){
        if(attachment.blocks){
            await saveBlocks(payload, attachment.blocks, workspace)
        }
        const resp = await saveAttachment(attachment, payload, workspace);
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

export const fixAttachments = async(workspace) => {
    const list = await getCollection('attachment', {from_url:null, image_url:null, block_ids:null});
    let currentWorkspace = workspace;
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
            initSlack(currentWorkspace);
        }

        const resp = await getMessagesBatch(message.channel, null, null, message.ts);
        if(!resp.messages.length){
            continue;
        }
        const slackMessage = resp.messages[0];
        // console.log("SLACK MESSAGE", slackMessage);
        await saveMessageData(slackMessage, message.workspace, message.channel)
    }
}

export const saveAttachment = async(attachment, payload, workspace) => {
    payload = {
        from_url: attachment.from_url,
        image_url: attachment.image_url,
        title: attachment.title,
        pretext: attachment.pretext,
        text: attachment.text,
        ts: payload.ts,
        channel: payload.channel,
        block_ids:payload.block_ids,
        workspace
    };
    console.log("SAVING ATTACHMENT", payload);
    return addedit('attachment', payload, 'id');
}
