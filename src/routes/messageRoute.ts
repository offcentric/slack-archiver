import express from 'express';
import * as controller from '../controllers/messageController';

const router = express.Router({mergeParams: true});

router.get('/list', controller.list);
router.post('/list', controller.list);

export default router;

