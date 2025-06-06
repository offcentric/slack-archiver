import express from 'express';
import * as controller from '../controllers/webhookController';

const router = express.Router({mergeParams: true});

router.post('/', controller.process);

export default router;

