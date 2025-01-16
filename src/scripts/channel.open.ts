import {initSlack, getChannel } from '../providers/slack';

const channelOpen = async (workspace, channelName, user?) => {

    await initSlack(workspace);
    const ret = await getChannel(channelName, user);
    console.log(ret);
    process.exit();

    // console.log("****************** ALL MESSAGES ************************");
    // console.log(allMessages);
}

if (process.argv.length > 4) {
    const ret = await channelOpen(process.argv[2], null, process.argv[4]);
    console.log(ret);
}else if(process.argv.length > 3) {
    const ret = await channelOpen(process.argv[2], process.argv[3]);
    console.log(ret);
}else if(process.argv.length > 2) {
    console.error("MISSING CHANNEL OR USER");
}else{
    console.error("MISSING WORKSPACE ARGUMENT");
}