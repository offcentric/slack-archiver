import {returnSuccess, returnError, returnExceptionAsError} from "helpers/response";
import {saveMessageData} from "models/message";
import {getChannelName, getWebhookToken} from "providers/slack";


export const save = async (req, res) => {

    if(!req.body){
        return returnError('no_body')
    }

    try{
        const body = req.body;

        if(body.challenge){
            return returnSuccess(res, body.challenge);
        }

        const workspace = req.params.workspace;

        const {channel, event, token} = body;

        if(!channel){
            return returnError(res,'missing_channel');
        }

        if(!event){
            return returnError(res,'missing_event_data');
        }

        if(!token){
            return returnError(res, 'missing_token');
        }

        if(body.token !== getWebhookToken()){
            return returnError(res, 'token_mismatch');
        }

        const channelName = await getChannelName(channel);
        const message = body.message

        const ret = await saveMessageData(message, workspace, channelName);
        return returnSuccess(res, ret);
    }catch (e){
        return returnExceptionAsError(res,e)
    }
}

export const test = async (req, res) => {
    return returnSuccess(res);
}