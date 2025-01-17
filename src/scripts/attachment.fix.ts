import {fixAttachments} from "models/attachment";

const attachmentFix = async (workspace) => {

    await fixAttachments(workspace);
    process.exit();

    // console.log("****************** ALL MESSAGES ************************");
    // console.log(allMessages);
}

if (process.argv.length > 2) {
    attachmentFix(process.argv[2]);
}else{
    console.error("MISSING WORKSPACE ARGUMENT");
}