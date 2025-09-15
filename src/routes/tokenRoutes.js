import express from "express";
import { authorize, protect } from "../middleware/auth.js";
import pkg from 'agora-access-token';
const { RtcTokenBuilder, RtmTokenBuilder, RtcRole, RtmRole } = pkg;

const router = express.Router();

const APP_ID = "6147232a6d8e42aebaf649bdc11fc387";
const APP_CERTIFICATE = "f5a65e6ca13d4efd8b26c3aa2fdda8c3";

router.route("/:channel/:uid")
    .get((req, res) => {
        const channelName = req.params.channel;
        const uid = req.params.uid;

        const expirationTimeInSeconds = 360000;
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

        const rtcToken = RtcTokenBuilder.buildTokenWithUid(
            APP_ID,
            APP_CERTIFICATE,
            channelName,
            0,
            RtcRole.PUBLISHER,
            privilegeExpiredTs
        );

        const rtmToken = RtmTokenBuilder.buildToken(
            APP_ID,
            APP_CERTIFICATE,
            uid,
            RtmRole.Rtm_User,
            privilegeExpiredTs
        );

        return res.json({ rtcToken, rtmToken });
    })

export default router;