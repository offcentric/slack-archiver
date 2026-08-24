import express from 'express';
import * as controller from '../controllers/healthController';

const router = express.Router({mergeParams: true});

router.get('/', controller.get);

export default router;
