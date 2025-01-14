import express from 'express';

import * as controller from '../controllers/messageController';
const router = express.Router({mergeParams: true});

router.post('/saveMessage', controller.save);

export default router;