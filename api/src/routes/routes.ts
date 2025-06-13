import express from 'express';

import fileRoute from "routes/fileRoute";
import messageRoute from "routes/messageRoute";
import userRoute from "routes/userRoute";
import webhookRoute from "routes/webhookRoute";

const router = express.Router({mergeParams: true});

router.use('/file', fileRoute);
router.use('/message', messageRoute);
router.use('/user', userRoute);
router.use('/webhook', webhookRoute);

export default router;
