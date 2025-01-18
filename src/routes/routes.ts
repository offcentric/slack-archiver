import express from 'express';

import {process, test} from '../controllers/webhookController';
const router = express.Router({mergeParams: true});

router.post('/webhook', process);
router.get('/test', test);

export default router;
