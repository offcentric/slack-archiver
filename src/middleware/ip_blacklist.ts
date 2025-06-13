import {NextFunction, Request, Response} from "express";
import {getBy} from "helpers/data";
import {LocationHelper} from "helpers/location";
import {getDateTime} from "helpers/date";
import {getEnvConfig} from "helpers/config";
import {status} from "helpers/status";

const checkBlacklist = async (req: Request, res:Response , next: NextFunction) => {
    if(!getEnvConfig('ENABLE_IP_BLACKLIST', false)) {
        next();
        return;
    }
    const ipAddress = (new LocationHelper(req)).getIpAddress();

    const userAgent = req.headers['user-agent'];
    const check = await getBy('ip_blacklist', {ip_address: ipAddress}, null, false, ['*']);

    if (check) {
        console.error(`************************** IP BLACKLISTED, BLOCKED REQUEST datetime: ${getDateTime()} remote address: ${ipAddress} user agent: ${userAgent} **************************`);
        res.status(status.forbidden);
        return res.send(JSON.stringify({error: true, code: status.forbidden, message: 'ip_blacklisted'}));
    }
    next();
}

export default checkBlacklist;