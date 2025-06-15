import express from 'express';
import * as controller from '../controllers/slackuserController';

const router = express.Router({mergeParams: true});

router.post('/list', controller.list);
router.post('/get', controller.get);

export default router;
