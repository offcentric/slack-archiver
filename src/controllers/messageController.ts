import {returnSuccess, returnError} from "helpers/response";
import {saveMessageData} from "models/message";
import {getChannelName, getWebhookToken} from "providers/slack";


export const save = async (req, res) => {
    const body = JSON.parse(req.body);
    const workspace = req.params.workspace;

    const {channel, event, token} = body;
    const channelName = await getChannelName(channel);
    
    if(!event){
        return returnError('missing_event_data');
    }

    if(!token){
        return returnError('missing_token');
    }

    if(body.token !== getWebhookToken()){
        return returnError('token_mismatch');
    }

    const message = body.message

    const ret = await saveMessageData(message, workspace, channelName);
    return returnSuccess(res, ret);
}