import {returnSuccess, returnError, returnExceptionAsError} from "helpers/response";
import {saveMessageData} from "models/message";
import {saveUser} from "models/user";
import {initSlack}  from 'providers/slack';
import {getEnvConfig} from "helpers/config";

export const process = async (req, res) => {

    const body = req.body;

    if(!req.body){
        return returnError('no_body')
    }

    if(body.challenge){
        return returnSuccess(res, body.challenge);
    }

    const workspace:string = req.query.workspace;

    if(!workspace){
        return returnError(res,'missing_workspace');
    }

    const {event, token} = body;

    if(!event){
        return returnError(res,'missing_event_data');
    }

    if(!token){
        return returnError(res, 'missing_token');
    }

    const slack = initSlack(workspace);

    if(token !== slack.getWebhookToken()){
        return returnError(res, 'token_mismatch');
    }

    // console.log("SLACK MESSAGE", body);
    const channel = event.channel;

    if(!channel){
        return returnError(res,'missing_channel');
    }

    try{
        const channelName = await slack.getChannelName(channel);
        if(getEnvConfig('SLACK_IGNORED_CHANNELS_'+workspace.toUpperCase(), []).includes(channelName)){
            return returnError(res,'channel_on_ignore_list: '+channelName);
        }

        const eventType = event.type;

        if(!['message','team_join','channel_created','channel_rename','channel_archive','channel_unarchive','channel_deleted','group_rename','group_archive','group_unarchive','group_deleted'].includes(eventType)){
            return returnError(res,'invalid_event_type: '+eventType);
        }

        var ret;

        if(eventType === 'message'){
            let message = event;
            if(message.subtype && message.subtype === 'message_changed'){
                message = event.message;
                message.ts = event.previous_message.ts;
            }
            ret = await saveMessageData(message, workspace, channelName, event.thread_ts);
        }else if(eventType === 'team_join'){
            const user = event.user;
            ret = await saveUser(user, workspace)
        }else if(['channel_created','channel_deleted','group_deleted','channel_rename','group_rename','channel_archive','group_archive','channel_unarchive','group_unarchive'].includes(eventType) || await slack.privateChannelCreated(event)){
            slack.refeshChannelList();
        }
        return returnSuccess(res, ret);
    }catch (e){
        await slack.sendAlert('error_posting_message_to_database: '+e.message);
        return returnExceptionAsError(res,e)
    }
}

export const test = async (req, res) => {
    return returnSuccess(res);
}