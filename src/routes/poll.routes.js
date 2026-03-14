import { Router } from "express";

import verifyLogin from "../middlewares/auth/verifyLogin.js";

import { addPollLimiter, burstLimiter } from "../middlewares/limiters/setLimiters.js";
import { validate } from "../middlewares/validate/validate.middleware.js";
import { addPollSchema, closePollSchema } from "../validations/poll.schema.js";
import { closePoll, createPoll, fetchPolls/*, getPollByID*/ } from "../controllers/poll.controller.js";

const router = Router();

router.use(verifyLogin);

router.get('/', fetchPolls);
// router.get('/:id', getPollByID);

router.post('/', burstLimiter, addPollLimiter, validate(addPollSchema), createPoll);
router.post('/:id/close', burstLimiter, validate(closePollSchema), closePoll);

export default router;