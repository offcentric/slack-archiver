import {returnSuccess, returnError, returnExceptionAsError} from "helpers/response";
import {saveMessageData} from "models/message";
import {getChannelName, getWebhookToken, initSlack} from "providers/slack";


export const save = async (req, res) => {

    if(!req.body){
        return returnError('no_body')
    }

    try{
        const body = req.body;
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

        if(token !== getWebhookToken(workspace)){
            return returnError(res, 'token_mismatch');
        }

        const channel = event.channel;

        if(!channel){
            return returnError(res,'missing_channel');
        }

        await initSlack(workspace);
        const channelName = await getChannelName(channel);

        const ret = await saveMessageData(event, workspace, channelName);
        return returnSuccess(res, ret);
    }catch (e){
        return returnExceptionAsError(res,e)
    }
}

export const test = async (req, res) => {
    return returnSuccess(res);
}