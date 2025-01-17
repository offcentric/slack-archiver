import {getFileByUid} from "models/file";

const fileSave = async (workspace, fileUid, channelName?) => {

    await getFileByUid(fileUid, workspace, true, channelName);
    process.exit();

    // console.log("****************** ALL MESSAGES ************************");
    // console.log(allMessages);
}
if (process.argv.length > 4) {
    fileSave(process.argv[2], process.argv[3], process.argv[4]);
}else if (process.argv.length > 3) {
    // console.log("CONTENT TYPE", process.argv[2]);
    fileSave(process.argv[2], process.argv[3]);
}else if (process.argv.length > 2) {
    console.error("MISSING FILE ID ARGUMENT");
}else{
    console.error("MISSING WORKSPACE AND FILE ID ARGUMENT");
}
