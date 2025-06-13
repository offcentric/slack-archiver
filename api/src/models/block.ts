import {addedit} from "helpers/data";
import Metadata from "interfaces/_metadata";
import GenericModel from "models/_genericModel";
import {Request} from "express";

const metadata:Array<Metadata> = [

];

export class Block extends GenericModel {
    indexField = 'id';
    messageCount = 0;

    constructor(req: Request) {
        super('block', {metadata}, req);
    }

    async saveBatch (payload:any, blocks:Array<any>){
        const blockIds = [];
        for(let block of blocks){
            if(['image','link'].includes(block.type)){
                const resp = await this.save(block);
                if(typeof resp.response === "object"){
                    blockIds.push(resp.response.id);
                }else{
                    blockIds.push(resp.response+'');
                }
            }
        }
        if(blockIds.length){
            payload.block_ids = blockIds;
        }
    }

    async save(blockData) {
        const payload:any = {uid:blockData.block_id, image_url:blockData.image_url, alt_text:blockData.alt_text, type:blockData.type, url:blockData.url, text:blockData.text};

        // if(block.type === 'rich_text' || block.type === 'rich_text_section'){
        //     payload.elements = JSON.stringify(block.elements);
        // }
        console.log("SAVING BLOCK", payload);
        const ret = await this._addedit(payload, 'add', ['id','uid']);
        return ret;
    }
}

