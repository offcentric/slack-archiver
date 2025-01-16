import {addedit, getCollection} from "helpers/data";
import {getEnvConfig} from "helpers/config";
import fs  from 'fs';
import {getDateTime} from "helpers/date";
import {getFile, getChannelName, getAppToken, getUserToken} from "providers/slack";

export const saveFiles = async (payload:any, files:Array<any>, workspace) => {

    const fileIds = [];
    for(let file of files){
        // console.log("SAVING FILE", file);
        await downloadFile(file, payload.channel, workspace);
        const resp = await saveFile(file, workspace);
        // console.log("FILE SAVED", resp);
        if(typeof resp === "object"){
            fileIds.push(resp.id);
        }else{
            fileIds.push(resp+'');
        }

    }
    if(fileIds.length){
        payload.file_ids = fileIds;
    }
}

export const getFileByUid = async (uid:string, workspace, doSave = false, channelName?) => {
   const {file} = await getFile(uid);
   if(doSave){
       const channelId = file.channels[0];
       if(!channelName){
           channelName = await getChannelName(channelId);
       }
       await downloadFile(file, channelName, workspace)
       await saveFile(file, workspace);
   }
}

const downloadFile = async(file, channelName, workspace) => {
    const userToken = getUserToken(workspace)

    let response;
    const options =  {
        method: "GET",
        headers: {Authorization: "Bearer "+userToken}
    };

    let downloadUrl;
    // console.log("DOWNLOAD FILE START", file);
    if(file.mp4){
        const maxDownloadSize = getEnvConfig('MAX_DOWNLOAD_FILE_SIZE_KB', 100000)*1000;
        if(parseInt(file.size) > maxDownloadSize) {
            console.log("VIDEO FILE EXCEEDS MAX DOWNLOAD SIZE OF "+maxDownloadSize+', CANNOT DOWNLOAD');
            return;
        }
        downloadUrl = file.mp4;
    }else if(file.thumb_1024){
        downloadUrl = file.thumb_1024;
    }else if(file.url_private && file.url_private.indexOf('dropbox.com') === -1){
        downloadUrl = file.url_private;
    }else if(file.thumb_800){
        downloadUrl = file.thumb_800;
    }else if(file.thumb_720){
        downloadUrl = file.thumb_720;
    }else if(file.thumb_480){
        downloadUrl = file.thumb_480;
    }else if(file.thumb_360){
        downloadUrl = file.thumb_360;
    }else if(file.thumb_160){
        downloadUrl = file.thumb_160;
    }

    if(!downloadUrl){
        return;
    }

    response = await fetch(downloadUrl, options);
    // response = await fetch('https://i.redd.it/n9w3al69rcbe1.jpeg');
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = file.title.replace(/^https?:\/\//, '').replaceAll('/','-')+'--'+file.id+'.'+file.filetype;

    if(!fs.existsSync('files/'+workspace)){
        fs.mkdirSync('files/'+workspace);
    }
    if(!fs.existsSync('files/'+workspace+'/'+channelName)){
        fs.mkdirSync('files/'+workspace+'/'+channelName);
    }
    file.savepath = 'files/'+workspace+'/'+channelName+'/'+fileName;
    // console.log("DOWNLOAD FILE", file);
    fs.writeFileSync(file.savepath, buffer);
}

export const saveFile = async(file, workspace) => {
    const payload = {uid:file.id, created_at:getDateTime(file.timestamp), name:file.name, title:file.title, mimetype:file.mimetype, filetype:file.filetype, user:file.user, workspace, url:file.url_private, thumbnail:file.thumb_360, savepath:file.savepath};
    console.log("SAVE FILE", payload);
    return addedit('file', payload, 'uid', 'add', ['uid','id']);
}
