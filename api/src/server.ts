import express, {Request, Response} from 'express';
import cors from 'cors';
import path from 'path';
import pgStore from 'connect-pg-simple';
import session from 'express-session';
import routes from './routes/routes';
import morgan from 'morgan';
import * as rfs from 'rotating-file-stream';
import { fileURLToPath } from 'url';
import { getEnvConfig } from './helpers/config';
import {responseHeaders} from './helpers/response';
import doRateLimit from "middleware/ratelimit";
import checkBlacklist from "middleware/ip_blacklist";
import logging from "middleware/logging";

class Server{

    app;
    router;
    constructor(){
        this.app = express();
        this.router = express.Router({mergeParams: true});
        this.routes();
        this.server();
    }

    routes() {

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);

        const corsOptions = {
            origin: [/mark.local:[0-9]{4}$/,/localhost:[0-9]{4}$/,/\*.slack\.(com)$/],
            optionsSuccessStatus: 200
        };

        this.app.use(express.urlencoded({extended:false}));
        this.app.use(express.json());

        this.app.use(async (req:Request, res:Response, next) => {
            //check ip blacklist
            await checkBlacklist(req, res, next);
        });

        this.app.use(async (req:Request, res:Response, next) => {
            // request rate limiting
            await doRateLimit(req, res, next);
        });

        this.app.set('trust proxy', 1);
        this.app.use(session({
            cookie: {
                secure: true,
                maxAge: 60000,
                expires: false,
                sameSite: 'none'
            },
            nane:'ch-api',
            resave: false,
            saveUninitialized: false,
            secret: 'm0ntegrapp4',
            maxAge: 10800000,
            store: new (pgStore(session))({
                tableName : 'user_session'
            })
        }));

        this.app.use((req:Request, res:Response, next) => {
            const sessionId = req.body['session_id'];
            req.sessionStore.get(sessionId, (_err, _sess) => {
                next();
            });
        });

        this.app.use(cors(corsOptions));

        // enable logging
        const today = new Date().toISOString().slice(0, 10)

        const accessLogStream = rfs.createStream('access_'+today+'.log', {interval: '1d', path: path.join(__dirname, '../log')})
        this.app.use(morgan('combined', { stream: accessLogStream }));
        this.app.use('/', logging);
        this.app.use('/', routes);


        // catch 404 and forward to error handler
        this.app.use(function (req, res, next) {
            res.status(404);
            next();
        });

        // error handler
        this.app.use(function (req, res, err) {
            // set locals, only providing error in development
            if(res.locals){
                res.locals.message = err.message;
                res.locals.error = err;
            }

            // render the error page
            res.status(res.statusCode || 500);
            res.set(responseHeaders).send(JSON.stringify({error:true, code:404}));
        });
    }

    server(){
        console.log('listening on ' + getEnvConfig('PORT'));
        this.app.listen(getEnvConfig('PORT'));
    }
}

export default new Server();