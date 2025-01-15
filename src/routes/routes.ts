import express from 'express';

import {save, test} from '../controllers/messageController';
const router = express.Router({mergeParams: true});

router.post('/saveMessage', save);
router.get('/test', test);

export default router;
