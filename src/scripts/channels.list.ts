import {initSlack, getChannellist } from '../providers/slack';

const channelsList = async (workspace) => {

    await initSlack(workspace);
    const ret = await getChannellist();
    console.log(ret);
    process.exit();

    // console.log("****************** ALL MESSAGES ************************");
    // console.log(allMessages);
}

if (process.argv.length > 2) {
    const ret = await channelsList(process.argv[2]);
    console.log(ret);
}else{
    console.error("MISSING WORKSPACE ARGUMENT");
}