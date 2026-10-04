import express from 'express';
import * as controller from '../controllers/adminController';

const router = express.Router({mergeParams: true});

router.post('/sync', controller.sync);
router.post('/channels', controller.channels);

export default router;
