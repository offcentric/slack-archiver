import express from 'express';
import * as controller from '../controllers/messageController';

const router = express.Router({mergeParams: true});
router.post('/get', controller.get);
router.get('/list', controller.list);
router.post('/list', controller.list);
router.post('/search', controller.search);

export default router;

