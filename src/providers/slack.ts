import {ConversationsHistoryArguments, ConversationsHistoryResponse, WebClient} from '@slack/web-api';
import { getEnvConfig } from '../helpers/config';
import NodeCache from "node-cache";
import Exception from '../models/exception';
import * as console from "node:console";

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

class SlackProvider {

    workspace:string;
    slack:WebClient;
    cache = new NodeCache();
    defaultChannel = getEnvConfig("SLACK_DEFAULT_CHANNEL", 'alerts');
    channelListCacheKey:string;

    constructor(workspace:string){
        this.workspace = workspace;
        const appToken = this.getAppToken();
        console.log("LOADED WORKSPACE CONFIG ", workspace, appToken);
        this.slack = new WebClient(appToken);
        currentWorkspace = workspace;
        this.channelListCacheKey = 'SLACK_CHANNELS_LIST_'+this.workspace.toUpperCase()
    }

    getWebhookToken(){
        return getEnvConfig('SLACK_WEBHOOK_TOKEN_'+this.workspace.toUpperCase());
    }

    getAppToken(){
        return getEnvConfig("SLACK_APP_TOKEN_"+this.workspace.toUpperCase());
    }

    getUserToken(){
        return getEnvConfig("SLACK_USER_TOKEN_"+this.workspace.toUpperCase());
    }

    async getChannelId(channelName:string):Promise<string>{

        const channels = await this.getChannelList();
        if(!channels[channelName]){
            throw new Exception('channel_not_found: '+channelName);
        }
        return channels[channelName];
    }

    async getChannelName(channelId:string):Promise<string>{

        const channels = await this.getChannelList();
        const channelIds = Object.values(channels);
        const pos = channelIds.indexOf(channelId);

        if(pos === -1){
            throw new Exception('channel_not_found');
        }
        const ret = Object.keys(channels)[pos];
        return ret;
    }

    async getChannelList(){

        let ret: object = this.cache.get(this.channelListCacheKey);

        if(!ret || !Object.keys(ret).length){
            ret = {};
            const channelsData = await this.slack.conversations.list({types:'public_channel,private_channel'});
            for(const i in channelsData.channels){
                const channelData = channelsData.channels[i];
                ret[channelData.name] = channelData.id;
            }
            this.cache.set(this.channelListCacheKey, ret);
        }
        // console.log("CHANNELS LIST FOR "+this.workspace, ret);
        return ret;
    }

    async refeshChannelList(){
        this.cache.del(this.channelListCacheKey);
        console.log("CHANNEL LIST", await this.getChannelList());
        return this.workspace+' channel_list_cache_flushed';
    }

    async getChannel(channelName, user){
        const payload = {channel:null, users:null, return_im:true}
        if(channelName){
            payload.channel = await this.getChannelId(channelName)
        }
        if(user){
            payload.users = user;
        }
        return await this.slack.conversations.open(payload);
    }

    async privateChannelCreated(event){
        // there is no real great way to capture a private group being created (group_open doesn't actually work) so we have to make assumptions.
        if(event.type === 'message' && event.subtype === 'channel_join' && event.channel_type === 'group'){
            const channelList = await this.getChannelList();
            const channelIds = Object.values(channelList);
            if(!channelIds.includes(event.channel)){
                return true;
            }
        }
        return false;
    }

    async getUserlist(){
        const ret = await this.slack.users.list({});
        return ret;
    }

    async getMessagesBatch (channelName:string, channelId?:string, cursor?, latest?: number, limit?:number): Promise<ConversationsHistoryResponse>{

        if(!channelId){
            channelId = await this.getChannelId(channelName);
        }

        const payload:ConversationsHistoryArguments = {channel:channelId, limit:1000}
        if(latest){
            payload.latest = (latest) + '';
            payload.inclusive = true;
        }
        if(limit){
            payload.limit = limit;
        }
        if(cursor){
            payload.cursor = cursor;
        }
        console.log("CALLING slack.conversations.history", payload);
        const resp = await this.slack.conversations.history(payload);
        console.log("CONVERSATIONS", resp.ok, resp.messages.length);
        return resp;
    }

    async getRepliesForMessage(channelName:string, ts:string){
        const channelId = await this.getChannelId(channelName);
        console.log("CALLING slack.conversations.replies");
        const ret:any = await this.slack.conversations.replies({channel:channelId, ts});
        return ret;
    }

    async getFile (fileUid   :string){
        const ret = await this.slack.files.info({file:fileUid});
        console.log("FILE INFO", ret);
        return ret;
    }

    async sendMessage(message: string, channel?:string, attachment?:any|null, block?:any|null){
        if(!channel){
            channel = this.defaultChannel;
        }
        const channelId = await this.getChannelId(channel);
        const payload:MessageContents = {
            text: message,
            channel: channelId,
            blocks: [],
            attachments: []
        };

        if(attachment){
            if(typeof attachment !== 'string'){
                attachment = '```'+JSON.stringify(attachment)+'```';
            }
            payload.attachments = [{text:attachment}];
        }

        if(block){
            if(typeof block !== 'string'){
                block = JSON.stringify(block);
            }
            payload.blocks = [{type:'section', text:{type:'code', text:block}}];
        }

        const result = await this.slack.chat.postMessage(payload);
        return result;
    }

    async sendOk(message, channel?:string){
        if(!channel){
            channel = 'alerts';
        }
        return await this.sendMessage(`:white_check_mark: ${message} :white_check_mark:`, channel);
    }

    async sendAlert(message, channel?:string, attachment?:any|null, block?:any|null){
        if(!channel){
            channel = 'alerts';
        }
        return await this.sendMessage(`:rotating_light: ${message} :rotating_light:`, channel, attachment, block);
    }

    async sendInfo(message, channel?:string, attachment?:any|null, block?:any|null){
        if(!channel){
            channel = 'general';
        }
        return await this.sendMessage(`:bulb: ${message} :bulb:`, channel, attachment, block);
    }

    async sendError(message, channel?:string, attachment?:any|null, block?:any|null){
        if(!channel){
            channel = 'alerts';
        }
        return await this.sendMessage(`:x: ${message} :x:`, channel, attachment, block);
    }

}

var currentWorkspace:string, slack:SlackProvider;

export const initSlack = (workspace):SlackProvider => {
    if(!workspace){
        throw new Exception('missing_workspace');
    }
    if(currentWorkspace !== workspace){
        slack = new SlackProvider(workspace);
        currentWorkspace = workspace;
    }
    return slack;
}
