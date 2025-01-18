import {parseFlags} from "helpers/script";
import {getMessagesForChannel} from "models/message";
import process from "node:process";

const messagesSave = async (workspace:string, channelName?:string, user?:string, latest?:number, limit?:number) => {
    
    await getMessagesForChannel(workspace, channelName, user, latest, limit, true);
    process.exit();

}

if (process.argv.length > 2) {
    const workspace = process.argv[2];

    // parse flags
    if(process.argv.length > 3){
        const {channel, user, latest, limit} = parseFlags(process.argv);
        const ret = await messagesSave(workspace, channel, user, latest, limit);
        console.log(ret);

    }else{
        console.error('MISSING -c or -u FLAG');
        process.exit(1);
    }
}else{
    console.error("MISSING WORKSPACE ARGUMENT + FLAGS");
}