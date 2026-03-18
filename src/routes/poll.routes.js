import { Router } from "express";

import verifyLogin from "../middlewares/auth/verifyLogin.js";

import { addPollLimiter, burstLimiter } from "../middlewares/limiters/setLimiters.js";

import sanitizeBody from "../middlewares/sanitize/sanitize.middleware.js";

import { validate } from "../middlewares/validate/validate.middleware.js";
import { addPollSchema, closePollSchema } from "../validations/poll.schema.js";

import { closePoll, createPoll, fetchPolls/*, getPollByID*/ } from "../controllers/poll.controller.js";

const router = Router();

router.use(verifyLogin);

/**
 * @swagger
 * /polls:
 *   get:
 *     summary: Fetch all polls for logged-in user
 *     tags: [Polls]
 *     responses:
 *       200:
 *         description: Polls fetched successfully
 *       401:
 *         description: Unauthorized
 */

router.get('/', sanitizeBody, fetchPolls);
// router.get('/:id', getPollByID);

/**
 * @swagger
 * /polls:
 *   post:
 *     summary: Create a new Poll
 *     tags: [Polls]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - options
 *             properties:
 *               title:
 *                 type: string
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Poll created successfully
 *       400:
 *         description: Validation error or duplicate title
 */
router.post('/', burstLimiter, sanitizeBody, addPollLimiter, validate(addPollSchema), createPoll);

/**
 * @swagger
 * /polls/{id}/close:
 *   post:
 *     summary: Close an existing poll
 *     tags: [Polls]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Poll ID
 *     responses:
 *       200:
 *         description: Poll updated successfully
 *       404:
 *         description: Poll not found
 */
router.post('/:id/close', burstLimiter, sanitizeBody, validate(closePollSchema), closePoll);

export default router;