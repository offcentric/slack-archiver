import { Request } from 'express';
import { getEnvConfig } from './config';

export class LocationHelper{
    req:Request = null;

    constructor(req?) {
        if(req){
            this.req = req;
        }
    }

    getIpAddress() {
        let xForwardedFor = this.req.headers['x-forwarded-for'];
        const remoteAddress = this.req.socket ? this.req.socket.remoteAddress : '127.0.0.1';
        // console.log("x forwarded", xForwardedFor);
        // console.log("remoteAddress", remoteAddress);
        if(typeof xForwardedFor === 'object'){
            xForwardedFor = xForwardedFor[0];
        }
        let ipAddress = getEnvConfig('LOCAL') == 'true' ? '191.96.150.247' : (xForwardedFor || remoteAddress);
        // UK: 31.12.127.134
        // DE: 95.91.244.122
        // IT: 81.56.65.10
        // US: 191.96.150.247
        // console.log("IP ADDRESS", ipAddress);
        if(ipAddress.indexOf(',') !== -1){
            ipAddress = ipAddress.split(',')[0];
        }
        if(ipAddress.match(/^[0-9.]+$/)){
            return ipAddress;
        }
        return 0;
    }
}
