import {parseFlags} from "../../dist/helpers/script";
import {initSlack} from '../providers/slack';
import {getMessagesForChannel} from '../models/message';
import * as process from "node:process";

const messagesList = async (workspace:string, channelName?:string, user?:string, latest?:number) => {

    await initSlack(workspace);
    await getMessagesForChannel(workspace, channelName, user, latest);
    process.exit();

}

if (process.argv.length > 2) {
    const workspace = process.argv[2];

    // parse flags
    if(process.argv.length > 3){
        const {channel, user, latest} = parseFlags(process.argv);
        const ret = await messagesList(workspace, channel, user, latest);
        console.log(ret);

    }else{
        console.error('MISSING -c or -u FLAG');
        process.exit(1);
    }
}else{
    console.error("MISSING WORKSPACE ARGUMENT + FLAGS");
}