import {Request} from 'express';
import {checkAuth, SessionStore} from './auth';
import {isAdminRole} from './archiveQuery';
import {status} from './status';
import {User} from '../models/user';
import Exception from '../models/exception';

export const requireAdmin = async (req: Request): Promise<SessionStore> => {
    const session = await checkAuth(req);
    const user = await (new User(req))._get({email: session.email}, false);
    if (!user || !isAdminRole(user.role)) {
        throw new Exception('admin_only', status.forbidden);
    }
    return session;
};
