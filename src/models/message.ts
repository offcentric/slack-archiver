import {addedit, get, getBy, hardDeleteItem} from "helpers/data";
import {getDateTime} from "helpers/date";
import {getMessagesBatch, getRepliesForMessage} from "providers/slack";
import {saveAttachments} from "models/attachment";
import {saveFiles} from "models/file";
import {saveBlocks} from "models/block";
import Exception from "models/exception";

var messageCount = 0

export const getMessagesForChannel = async(channelName:string, workspace, doSave = false) => {

    let ret = [];
    let resp:any = {messages:[], has_more:true};
    let cursor = null;

    do{
        resp = await getMessagesBatch(channelName, cursor);
        console.log("LOADED "+resp.messages.length+" MESSAGES");
        if(!resp.messages.length){
            break;
        }
        const lastMessage = resp.messages[resp.messages.length-1];
        console.log("LAST MESSAGE",lastMessage, getDateTime(lastMessage.ts));
        await getMessageBatch(resp, channelName, workspace, doSave)
        ret = ret.concat(resp.messages);
        cursor = resp.response_metadata.next_cursor;
        console.log("NEXT CURSOR", cursor);
    }while (resp.has_more === true)

    console.log("TOTAL MESSAGE COUNT", messageCount);
    // console.log("MESSAGES FROM SLACK API", ret);
    return ret;
}

const getMessageBatch = async (resp, channelName, workspace, doSave) => {
    for (const message of resp.messages) {

        // console.log("MESSAGE", message, getDateTime(message.ts));

        if(message.type !== 'message' && !message.client_msg_id && !message.files){
            console.log("SKIPPING", message);
            continue;
        }
        messageCount++;


        if(doSave) {
            await saveMessageData(message, workspace, channelName)
        }

        if(message.reply_count){
            const replies = await getRepliesForMessage(channelName, message.ts);
            for(let reply of replies.messages) {
                if(reply.reply_count || !reply.client_msg_id){
                    continue;
                }
                messageCount++;

                // console.log("REPLY", reply.text, getDateTime(reply.ts));

                if(doSave) {
                    await saveMessageData(reply, workspace, channelName, message.ts)
                }
            }
        }
    }
}

export const saveMessageData = async(message, workspace, channelName, parentId?) => {
    console.log("MESSAGE", message);
    if(message.subtype === 'message_deleted'){
        const messageData = await getBy('message', {ts:message.deleted_ts}, [], false, ['block_ids', 'file_ids', 'attachment_ids']);
        if(!messageData){
            throw new Exception('message_not_found');
        }
        console.log("SAVED MESSAGE", messageData);
        if(messageData.block_ids.length){
            await hardDeleteItem('block', {id:messageData.block_ids});
        }
        if(messageData.file_ids.length){
            await hardDeleteItem('file', {id:messageData.file_ids});
        }
        if(messageData.attachment_ids.length){
            await hardDeleteItem('attachment', {id:messageData.attachment_ids});
        }
        return await hardDeleteItem('message', {ts:message.deleted_ts})
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
        await saveAttachments(payload, message.attachments, workspace)
    }

    if (message.files) {
        await saveFiles(payload, message.files, workspace)
    }

    if (message.blocks) {
        await saveBlocks(payload, message.blocks, workspace)
    }

    console.log("SAVING MESSAGE", payload);
    return await addedit('message', {...payload, workspace}, 'ts', 'add', ['id','ts']);
}