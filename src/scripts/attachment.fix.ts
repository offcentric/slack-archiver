import {Attachment} from "models/attachment";
import express from "express";

const attachmentFix = async (workspace) => {

    await (new Attachment(express.request)).fix(workspace);
    process.exit();

    // console.log("****************** ALL MESSAGES ************************");
    // console.log(allMessages);
}

if (process.argv.length > 2) {
    attachmentFix(process.argv[2]);
}else{
    console.error("MISSING WORKSPACE ARGUMENT");
}