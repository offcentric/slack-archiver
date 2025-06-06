import express from 'express';
import * as controller from '../controllers/userController';

const router = express.Router({mergeParams: true});

router.post('/list', controller.list);

export default router;
