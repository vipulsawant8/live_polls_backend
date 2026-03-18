import Poll from '../models/poll.model.js';

import ApiError from '../utils/ApiError.js';
import ERRORS from '../constants/errors.js';

import { randomUUID } from "crypto";

const POLL_EXPIRY_WINDOW = 7 * 24 * 60 * 60 * 1000;

const createPoll =  async (req, res) => {
	const userID = req.user._id;

	const { title, options } = req.body;
	req.log.info(
		{ userID, title, options },
		"Create poll attempt"
	);

	const formatedOpts = options.map(text => ({ text, vote: 0, optionID: randomUUID() }));

	const poll = await Poll.create({ userID, options: formatedOpts, title, expiresAt: Date.now() + POLL_EXPIRY_WINDOW });
	
	await poll.populate('userID', 'name');
	const createdPoll = await poll.toObject();
	const { userID: author, ...rest } = createdPoll;
	const formattedPoll = { author, ...rest };

	req.log.info(
		{ userID, pollId: formattedPoll._id },
		"Poll created successfully"
	);

	const response = { success: true, data: formattedPoll, message: `You created Poll "${poll.title}" successfully` };
	return res.status(201).json(response);
};

const fetchPolls =  async (req, res) => {
	const userID = req.user._id;

	req.log.info(
		{ userID },
		"Fetch polls request"
	);

	const polls = await Poll.find().sort({ createdAt: -1 }).populate('userID', "name").lean();
	const formattedPolls = polls.map(({ userID, ...rest }) => ({
		...rest,
		author: userID
	}));

	req.log.debug(
		{ userID, resultCount: formattedPolls.length },
		"Polls fetched successfully"
	);

	const response = { success: true, data: formattedPolls, message: "Polls fetched successfully" };
	return res.status(200).json(response);
};

// const getPollByID =  async (req, res) => {
	
// 	const pollID = req.params.id;

// 	const poll = await Poll.findOne({
// 		_id: pollID,
//   		open: true,
//   		expiresAt: { $gt: Date().now() }
// 	});
// 	if (!poll) throw new ApiError(404, ERRORS.POLL_NOT_FOUND);

// 	const response = { success: true, data: poll, message: "Poll fetched successfully" };
// 	return res.status(200).json(response);
// };

const closePoll =  async (req, res) => {
	const userID = req.user._id;
	const pollID = req.params.id;

	req.log.info(
		{ userID, pollID },
		"Close poll attempt"
	);

	const poll = await Poll.findOne({
		_id: pollID,
  		open: true,
  		expiresAt: { $gt: new Date() }
	});
	if (!poll) {
		
		req.log.warn(
			{ userID, pollID },
			"Failed: poll not found"
		);
		throw new ApiError(404, ERRORS.POLL_NOT_FOUND);
	}

	if (!poll.userID.equals(userID)) throw new ApiError(403, ERRORS.POLL_CLOSE_ACTION_FORBIDDEN);

	if (!poll.open) throw new ApiError(400, ERRORS.POLL_CLOSED);
	poll.open = false;
	await poll.save();

	await poll.populate('userID', 'name')
	const closedPoll = poll.toObject();
	const { userID: author, ...rest } = closedPoll;
	const formattedPoll = { author, ...rest };

	req.log.info(
		{ userID, pollID },
		"Poll closed successfully"
	);

	const response = { success: true, data: formattedPoll, message: `You closed Poll ${poll.title}" successfully` };
	return res.status(200).json(response);
};

export { createPoll, fetchPolls /*, getPollByID */, closePoll };