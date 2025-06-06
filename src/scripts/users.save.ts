import {initSlack}  from '../providers/slack';
import {User} from "models/user";
import express from "express";

const usersSave = async (workspace) => {

    console.log("WORKSPACE", workspace);
    const slack = initSlack(workspace);
    const resp = await slack.getUserlist();
    await (new User(express.request)).saveBatch(resp, workspace);
    process.exit();

    // console.log("****************** ALL MESSAGES ************************");
    // console.log(allMessages);
}

if (process.argv.length > 2) {
    // console.log("CONTENT TYPE", process.argv[2]);
    usersSave(process.argv[2]);
}else{
    console.error("MISSING WORKSPACE ARGUMENT");
}