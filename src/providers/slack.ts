import {ConversationsHistoryArguments, ConversationsHistoryResponse, WebClient} from '@slack/web-api';
import { getEnvConfig } from '../helpers/config';
import NodeCache from "node-cache";
import Exception from '../models/exception';
import {getDateTime} from "helpers/date";

var slack:WebClient;

const cache = new NodeCache();


interface Attachment{
    text: string
}
interface Block{
    type:string,
    text: {type: string, text: string}
}

interface MessageContents{
    text: string,
    channel: string,
    attachments?: Array<Attachment>,
    blocks?: Array<Block>
}

export const initSlack = async (workspace) => {
    const appToken = getAppToken(workspace);
    console.log("LOADED WORKSPACE CONFIG ", workspace, appToken);
    slack = new WebClient(appToken);
}

const getChannelId = async(channelName:string):Promise<string> => {

    const channels = await getChannellist();

    if(!channels[channelName]){
        throw new Exception('channel_not_found: '+channelName);
    }
    return channels[channelName];
}

export const getChannelName = async(channelId:string):Promise<string> => {

    const channels = await getChannellist();
    const channelIds = Object.values(channels);
    const pos = channelIds.indexOf(channelId);

    if(pos === -1){
        throw new Exception('channel_not_found');
    }
    const ret = Object.keys(channels)[pos];
    return ret;
}

export const getChannellist = async() => {
    let ret: object = cache.get('SLACK_CHANNELS_LIST')

    if(!ret || !Object.keys(ret).length){
        ret = {};
        const channelsData = await slack.conversations.list({types:'public_channel,private_channel'});
        for(const i in channelsData.channels){
            const channelData = channelsData.channels[i];
            ret[channelData.name] = channelData.id;
        }
        cache.set('SLACK_CHANNELS_LIST', ret);
    }
    return ret;
}

export const getChannel = async(channelName, user) => {
    const payload = {channel:null, users:null, return_im:true}
    if(channelName){
        payload.channel = await getChannelId(channelName)
    }
    if(user){
        payload.users = user;
    }
    return await slack.conversations.open(payload);
}

export const getUserlist = async() => {
    const ret = await slack.users.list({});
    return ret;
}

export const getMessagesBatch = async (channelName:string, channelId?:string, cursor?, latest?: number): Promise<ConversationsHistoryResponse> => {

    if(!channelId){
        channelId = await getChannelId(channelName);
    }

    const payload:ConversationsHistoryArguments = {channel:channelId, limit:1000}
    if(latest){
        payload.latest = (latest) + '';
        payload.inclusive = true;
    }
    if(cursor){
        payload.cursor = cursor;
    }
    console.log("CALLING slack.conversations.history", payload);
    const resp = await slack.conversations.history(payload);
    console.log("CONVERSATIONS", resp);
    return resp;
}

export const getRepliesForMessage = async(channelName:string, ts:string) => {
    const channelId = await getChannelId(channelName);
    console.log("CALLING slack.conversations.replies");
    const ret:any = await slack.conversations.replies({channel:channelId, ts});
    return ret;
}

export const getFile = async (fileUid   :string) => {
    const ret = await slack.files.info({file:fileUid});
    console.log("FILE INFO", ret);
    return ret;
}

export const getWebhookToken = (workspace:string) => {
    return getEnvConfig('SLACK_WEBHOOK_TOKEN_'+workspace.toUpperCase());
}

export const getAppToken = (workspace) => {
    return getEnvConfig("SLACK_APP_TOKEN_"+workspace.toUpperCase());
}

export const getUserToken = (workspace) => {
    return getEnvConfig("SLACK_USER_TOKEN_"+workspace.toUpperCase());
}