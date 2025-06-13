import { createHash } from 'crypto';
import {set as setCache, get as getCache} from '../helpers/cache';
import { getEnvConfig } from '../helpers/config';
import { getDateTime } from '../helpers/date';
import {status} from "helpers/status";

const doRateLimit = async (req, res, next) => {
    if(!getEnvConfig('ENABLE_RATE_LIMIT', false)){
        next();
        return;
    }

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const whitelistedHosts = getEnvConfig('RATELIMIT_WHITELISTED_HOSTS', 'localhost,127.0.0.1', 'array');
    if(whitelistedHosts.includes(ip)){
        next();
        return;
    }
    // console.log("REMOTE IP HEADERS", req.headers);
    // console.log("REMOTE IP SOCKET", req.socket);
    const userAgent = req.headers['user-agent'];
    const path = req.url;
    const params = req.body ? JSON.stringify(req.body) : '';
    const fingerprint = [userAgent,ip,path,params].join('||');
    const hashed = createHash('sha1').update(fingerprint).digest('hex');
    const cacheKey = 'api_call_'+hashed;
    const now = Date.now()/1000;

    let requestCount = 1;
    let requestTimestamp = now;
    try{
        const maxRequests = 5;
        const per = 5;

        const {count, since} = await getCache(cacheKey);
        if(count){
            requestTimestamp = since;
            if(count >= maxRequests){
                console.error(`************************** RATE LIMIT EXCEEDED , BLOCKED REQUEST datetime: ${getDateTime()} path: ${path} remote address: ${ip} user agent: ${userAgent} **************************`);
                res.status(status.too_many_requests);
                res.send(JSON.stringify({error:true, code:status.too_many_requests, message:'rate_limited'}));
                return;
            }
            requestCount = count+1;
        }

        await setCache(cacheKey, JSON.stringify({count:requestCount, since:requestTimestamp}), per);
    }catch(e){
        console.error("ERROR PROCESSING RATE LIMIT FOR "+path, e);
    }
    next();
}
export default doRateLimit;