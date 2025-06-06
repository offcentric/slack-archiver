import {Request} from "express";
import GenericModel from "models/_genericModel";

export default class AbstractDbModel extends GenericModel {

    constructor(req:Request) {
        super('abstract', {}, req)
    }
}