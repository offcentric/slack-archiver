import express from 'express';

import adminRoute from "routes/adminRoute";
import fileRoute from "routes/fileRoute";
import healthRoute from "routes/healthRoute";
import messageRoute from "routes/messageRoute";
import slackuserRoute from "routes/slackuserRoute";
import userRoute from "routes/userRoute";
import webhookRoute from "routes/webhookRoute";

const router = express.Router({mergeParams: true});

router.use('/health', healthRoute);
router.use('/admin', adminRoute);
router.use('/file', fileRoute);
router.use('/message', messageRoute);
router.use('/slackuser', slackuserRoute);
router.use('/user', userRoute);
router.use('/webhook', webhookRoute);

export default router;
