import {File} from "models/file";
import express from "express";

const fileInfo = async (workspace, fileUid) => {

    await (new File(express.request)).getByUid(fileUid, workspace);
    process.exit();

    // console.log("****************** ALL MESSAGES ************************");
    // console.log(allMessages);
}

if (process.argv.length > 3) {
    // console.log("CONTENT TYPE", process.argv[2]);
    fileInfo(process.argv[2], process.argv[3]);
}else if (process.argv.length > 2) {
    console.error("MISSING FILE ID ARGUMENT");
}else{
    console.error("MISSING WORKSPACE AND FILE ID ARGUMENT");
}
