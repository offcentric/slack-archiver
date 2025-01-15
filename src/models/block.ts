import {addedit, getCollection} from "helpers/data";

export const saveBlocks = async (payload:any, blocks:Array<any>, workspace) => {
    const blockIds = [];
    for(let block of blocks){
        if(['image','link'].includes(block.type)){
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
    const payload:any = {uid:block.block_id, image_url:block.image_url, alt_text:block.alt_text, type:block.type, url:block.url, text:block.text};

    // if(block.type === 'rich_text' || block.type === 'rich_text_section'){
    //     payload.elements = JSON.stringify(block.elements);
    // }
    console.log("SAVING BLOCK", payload);
    const ret = await addedit('block', payload, 'uid', 'add', ['id','uid']);
    return ret;
}
