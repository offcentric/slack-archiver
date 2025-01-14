import {addedit, getCollection} from "helpers/data";

export const saveBlocks = async (payload:any, blocks:Array<any>, workspace) => {
    const blockIds = [];
    for(let block of blocks){
        if(block.type === 'image'){
            const resp = await saveBlock(block);
            if(typeof resp === "object"){
                blockIds.push(resp.id);
            }else{
                blockIds.push(resp+'');
            }
        }
    }
    if(blockIds.length){
        payload.block_ids = blockIds;
    }
}

export const saveBlock = async(block) => {
    console.log("BLOCK TITLE", block.title);
    const payload = {uid:block.block_id, image_url:block.image_url, alt_text:block.alt_text, type:block.type};
    console.log("SAVING BLOCK", payload);
    return addedit('block', payload, 'uid', 'add', ['id','uid']);
}
