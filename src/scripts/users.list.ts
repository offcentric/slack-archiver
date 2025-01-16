import {initSlack, getUserlist } from '../providers/slack';

const usersList = async (workspace) => {

    await initSlack(workspace);
    const ret = await getUserlist();
    console.log(ret);
    process.exit();

    // console.log("****************** ALL MESSAGES ************************");
    // console.log(allMessages);
}

if (process.argv.length > 2) {
    const ret = await usersList(process.argv[2]);
    console.log(ret);
}else{
    console.error("MISSING WORKSPACE ARGUMENT");
}