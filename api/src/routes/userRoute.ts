import express from 'express';
import * as controller from '../controllers/userController';

const router = express.Router({mergeParams: true});

router.post('/sendlogincode', controller.sendlogincode);
router.post('/login', controller.login);
router.post('/logout', controller.logout);

export default router;
