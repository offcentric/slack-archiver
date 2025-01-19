import {parseFlags} from "helpers/script";
import {getMessagesForChannel} from "models/message";
import process from "node:process";

const messagesSave = async (workspace:string, channelName?:string, latest?:number, limit?:number) => {
    
    await getMessagesForChannel(workspace, channelName, latest, limit, true);
    process.exit();

}

if (process.argv.length > 2) {
    const workspace = process.argv[2];
    if(process.argv.length > 3){
        const channel = process.argv[3];
        if(process.argv.length > 4) {
            // parse flags
            const {latest, limit} = parseFlags(process.argv);
            const ret = await messagesSave(workspace, channel, latest, limit);
            console.log(ret);
        }
    }else{
        console.error('Missing channel');
        process.exit(1);
    }
}else{
    console.error("Missing workspace + channel");
}