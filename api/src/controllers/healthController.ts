import {Request, Response} from "../interfaces/controller";

export const get = async (_req: Request, res: Response) => {
    return res.status(200).json({status: 'ok'});
}
