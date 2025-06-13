import { getEnvConfig } from "../helpers/config";
import { ApiLog } from '../models/apilog';

const logging = async (req, res, next) => {
    const apiLog = new ApiLog(req);
    const tsRequest = Date.now();
    // console.log("PATH!", req.path, loggablePaths.indexOf(path));

    // Store the original send method
    const _send = res.send;
    // Override it
    res.send = async function (body) {
        // Reset it
        res.send = _send;
        // Actually send the response
        res.send(body);
        const tsResponse = Date.now();
        // console.log("REQUEST", req);
        if(Array.isArray(body)){
            body = body[0];
        }
        const payload = {
            path:req.originalUrl,
            method:req.method,
            payload:JSON.stringify(req.body),
            response_code:res.statusCode,
            response_data:JSON.stringify(body),
            remote_ip:req.headers['x-forwarded-for'] || req.socket.remoteAddress,
            headers:JSON.stringify(cleanHeaders(req.rawHeaders)),
            request_at: new Date(tsRequest).toUTCString(),
            response_at: new Date(tsResponse).toUTCString(),
            response_time: tsResponse - tsRequest
        };
        // console.log("INCOMING API PAYLOAD BODY", body);
        // console.log("API CALL RESPONSE", res);
        // console.log("LOG PAYLOAD", payload);
        try{
            await apiLog._addedit(payload);
        }catch(e){
            console.error("API LOG", payload, e.message)
        }
    };
    next();
};

const cleanHeaders = (headers) => {
    if(getEnvConfig('ENABLE_MASK_PRIVATE_DATA', true)){
        for(let i=0; i<headers.length; i++){
            const item = headers[i];
            if(['cookie','authorization'].indexOf(item.toLowerCase()) !== -1){
                i++;
                headers[i] = '**************************';
            }
        }
    }
    return headers;
}

export default logging;