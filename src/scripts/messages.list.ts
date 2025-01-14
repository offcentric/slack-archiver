import {getRepliesForMessage, initSlack} from '../providers/slack';
import {getMessagesForChannel} from '../models/message';

const messagesList = async (workspace, channelName) => {

    await initSlack(workspace);
    await getMessagesForChannel(channelName, workspace);
    process.exit();

    // console.log("****************** ALL MESSAGES ************************");
    // console.log(allMessages);
}

if (process.argv.length > 3) {
    // console.log("CONTENT TYPE", process.argv[2]);
    messagesList(process.argv[2], process.argv[3]);
}else if (process.argv.length > 2) {
    console.error("MISSING CHANNEL NAME ARGUMENT");
}else{
    console.error("MISSING WORKSPACE AND CHANNEL NAME ARGUMENT");
}