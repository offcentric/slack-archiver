import express from 'express';
import * as controller from '../controllers/adminController';

const router = express.Router({mergeParams: true});

router.post('/sync', controller.sync);
router.post('/channels', controller.channels);
router.post('/thumbnails', controller.thumbnails);

export default router;
