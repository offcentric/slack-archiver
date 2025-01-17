import {returnSuccess, returnError, returnExceptionAsError} from "helpers/response";
import {saveMessageData} from "models/message";
import {initSlack}  from 'providers/slack';


export const save = async (req, res) => {

    const body = req.body;

    if(!req.body){
        return returnError('no_body')
    }

    if(body.challenge){
        return returnSuccess(res, body.challenge);
    }

    const workspace = req.query.workspace;

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
        let message = event;

        if(message.subtype && message.subtype === 'message_changed'){
            message = event.message;
            message.ts = event.previous_message.ts;
        }
        const ret = await saveMessageData(message, workspace, channelName, event.thread_ts);
        return returnSuccess(res, ret);
    }catch (e){
        await slack.sendAlert('error_posting_message_to_database: '+e.message);
        return returnExceptionAsError(res,e)
    }
}

export const test = async (req, res) => {
    return returnSuccess(res);
}