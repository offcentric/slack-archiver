import {initSlack}  from '../providers/slack';

const usersList = async (workspace) => {
    const slack = initSlack(workspace);
    const ret = await slack.getUserlist();
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