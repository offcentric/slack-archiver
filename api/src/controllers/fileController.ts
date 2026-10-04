import fs from 'fs';
import {GenericController} from '../controllers/_genericController';
import {Request, Response} from "../interfaces/controller";
import {File} from '../models/file';
import {checkAuth} from "helpers/auth";
import {getWorkspaceNames} from "interfaces/user";
import {getEnvConfig} from "helpers/config";
import {contentDispositionFilename, FILE_SORT_COLUMNS, sanitizeOrderBy} from "helpers/archiveQuery";
import {archiveRoots, resolveArchiveFile} from "helpers/fileAccess";
import {parseByteRange} from "helpers/byteRange";
import {thumbnailPathForId} from "helpers/thumbnails";
import Exception from "models/exception";
import {status} from "helpers/status";

export class FileController extends GenericController{
    tableName = 'file';
    declare model: File;
    constructor(req:Request){
        super(req);
        this.model = new File(req);
        this.model.orderBy = ['created_at', 'desc'];
        this.model.limit = 500;
    }

    async get(req:Request, res:Response) {
        try {
            const sessionData = await checkAuth(req);
            const payload = this.getPayload();
            const file = await this.model._get(payload, true, !req.body.simple);
            const allowed = getWorkspaceNames(sessionData.workspaces);
            if (!file?.workspace || !allowed.includes(file.workspace)) {
                throw new Exception('no_access_to_workspace', status.forbidden);
            }
            const [message, owner] = await Promise.all([
                this.model.findSourceMessage(file.id, file.workspace),
                this.model.findOwner(file.user, file.workspace),
            ]);
            return this.returnSuccess(res, {...file, message, ...owner});
        } catch (e) {
            return this.returnExceptionAsError(res, e);
        }
    }

    async list(req:Request, res:Response) {
        try{
            const sessionData = await checkAuth(req);
            const payload = this.getPayload();
            this.handleWorkspaceFilter(res, payload, sessionData);
            this.handleDateFilter(res, payload, 'created_at');
            const {orderBy, limit} = this.getOrderByAndLimit(req);
            const safeOrder = sanitizeOrderBy(orderBy, FILE_SORT_COLUMNS, ['created_at', 'desc']);
            if (payload.media) {
                delete payload.media;
                const ret = await this.model.listMedia(payload, safeOrder, limit);
                return this.returnSuccess(res, ret);
            }
            delete payload.channel;
            delete payload.media;
            const ret = await this.model._getCollection(payload, safeOrder, limit, true);
            return this.returnSuccess(res, ret);
        }catch (e) {
            return this.returnExceptionAsError(res, e);
        }
    }

    async content(req:Request, res:Response) {
        try {
            const sessionData = await checkAuth(req);
            const id = parseInt(String(req.params.id), 10);
            if (!id) {
                throw new Exception('invalid_file_id', status.bad);
            }
            const file = await this.model._get({id}, true, true);
            const allowed = getWorkspaceNames(sessionData.workspaces);
            if (!file?.workspace || !allowed.includes(file.workspace)) {
                throw new Exception('no_access_to_workspace', status.forbidden);
            }
            const target = resolveArchiveFile(
                archiveRoots(getEnvConfig('FILES_DOWNLOAD_DIRECTORY', '../files')),
                file.savepath,
            );
            if (!target || !fs.existsSync(target)) {
                throw new Exception('file_not_on_disk', status.notfound);
            }
            const filename = contentDispositionFilename(file.name || file.title);
            const {size} = fs.statSync(target);
            res.setHeader('Content-Type', file.mimetype || 'application/octet-stream');
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
            res.setHeader('Cache-Control', 'private, max-age=3600');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            res.setHeader('Accept-Ranges', 'bytes');
            const range = parseByteRange(req.headers.range, size);
            if (range.kind === 'unsatisfiable') {
                res.status(status.range_not_satisfiable);
                res.setHeader('Content-Range', `bytes */${size}`);
                return res.end();
            }
            if (range.kind === 'partial') {
                const {start, end} = range.range;
                res.status(status.partial);
                res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
                res.setHeader('Content-Length', String(end - start + 1));
                return fs.createReadStream(target, {start, end}).pipe(res);
            }
            res.setHeader('Content-Length', String(size));
            fs.createReadStream(target).pipe(res);
        } catch (e) {
            return this.returnExceptionAsError(res, e);
        }
    }

    async thumbnail(req:Request, res:Response) {
        try {
            const sessionData = await checkAuth(req);
            const id = parseInt(String(req.params.id), 10);
            if (!id) {
                throw new Exception('invalid_file_id', status.bad);
            }
            const file = await this.model._get({id}, true, true);
            const allowed = getWorkspaceNames(sessionData.workspaces);
            if (!file?.workspace || !allowed.includes(file.workspace)) {
                throw new Exception('no_access_to_workspace', status.forbidden);
            }
            const target = thumbnailPathForId(id);
            if (!target || !fs.existsSync(target)) {
                throw new Exception('thumbnail_not_found', status.notfound);
            }
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Cache-Control', 'private, max-age=86400');
            res.setHeader('X-Content-Type-Options', 'nosniff');
            fs.createReadStream(target).pipe(res);
        } catch (e) {
            return this.returnExceptionAsError(res, e);
        }
    }
}

export const get = async(req:Request, res:Response) => {
    return await (new FileController(req)).get(req, res);
}

export const list = async(req:Request, res:Response) => {
    return await (new FileController(req)).list(req, res);
}

export const content = async(req:Request, res:Response) => {
    return await (new FileController(req)).content(req, res);
}

export const thumbnail = async(req:Request, res:Response) => {
    return await (new FileController(req)).thumbnail(req, res);
}
