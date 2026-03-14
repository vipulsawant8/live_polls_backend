import Poll from "../../models/poll.model.js";
import Vote from "../../models/vote.model.js";
import logger from "../../utils/logger.js";
import { POLL_EVENTS } from "../events/pollEvents.js";
import { voteLimiter } from "../limiters/socketLimiters.js";

const joinPollHandler = async(io, socket, { pollID }) => {

	const room = `poll:${pollID}`;
	if (!socket.rooms.has(room)) {
		socket.join(room);

		logger.debug({ room }, "User joined :");
	}

	try {
		const poll = await Poll.findOne({
			_id: pollID,
			open: true,
			expiresAt: { $gt: new Date() }
		}).lean();
	
		if (poll) {
			socket.emit(POLL_EVENTS.UPDATE_POLL_DATA, { poll });
		} else if (!poll) {
			socket.emit(POLL_EVENTS.POLL_CLOSED, { pollID });
			socket.leave(room);
		}
	} catch (error) {
		
		logger.error({ error }, "Error :");
	}
};

const leavePollHandler = async(io, socket, { pollID }) => {
	const room = `poll:${pollID}`;
	socket.leave(room);
};

const castVoteHandler = async(io, socket, { pollID, optionID, optionDocID }) => {
	try{

		const userID = socket.userID;
	  	const room = `poll:${pollID}`;
		logger.debug({ pollID, optionID, optionDocID, socketID: socket.id });
		logger.debug({ socketID: socket.id, time: Date.now() }, "Vote request received");

		if (!userID) {
			return socket.emit(POLL_EVENTS.VOTE_REJECTED, { message: "Login required" });
		}

  		const allowed = await voteLimiter(socket);
		logger.debug({ allowed });
		if (!allowed) {
			socket.emit(POLL_EVENTS.VOTE_REJECTED, {
				message: "Too many votes. Slow down."
			});
			return;
		}
		// Atomic increment of selected option
		const updateResult = await Poll.findOneAndUpdate(
			{
				_id: pollID,
				open: true,
				expiresAt: { $gt: new Date() }
			},
			{
				$inc: { "options.$[opt].votes": 1 }
			},
			{
				arrayFilters: [{ "opt._id": optionDocID }],
				new: true
			}
		).populate("userID", "name").lean();

		logger.debug({ updateResult }, "update");
		if (!updateResult) {
			return socket.emit(POLL_EVENTS.VOTE_REJECTED, { message: "Option Not Found" });
		}

		// Create vote (DB-level duplicate protection)
		await Vote.create({ pollID, userID, optionID, expiresAt: updateResult.expiresAt });

		const { userID:author, ...rest } = updateResult;
		const formattedPoll = { author, ...rest };

		// Broadcast to room
		io.to(room).emit(POLL_EVENTS.UPDATE_POLL_DATA, { poll: formattedPoll });
		socket.emit(POLL_EVENTS.VOTE_ACCEPTED, { message: "Vote counted" });

	} catch (err) {
		if (err.code === 11000) {
			await Poll.updateOne( { _id: pollID, "options._id": optionDocID },
				{ $inc: { "options.$[opt].votes": -1 } },{
				arrayFilters: [{ "opt._id": optionDocID }],
				new: true
			});
			return socket.emit(POLL_EVENTS.VOTE_REJECTED, { message: "Vote already casted" });
		}

		console.error("Vote error:", err);
		socket.emit(POLL_EVENTS.VOTE_REJECTED, { message: "Internal server error" });
	}
};

const addPollHandler = async(io, socket, { poll }) => {

	const name = socket.name;
	socket.broadcast.emit(POLL_EVENTS.ADD_POLL, { poll, name });
};

const closePollHandler = async(io, socket, { poll }) => {

	const name = socket.name;
	const room = `poll:${poll._id}`;
	socket.to(room).emit(POLL_EVENTS.CLOSE_POLL, { poll, name });
};

export { castVoteHandler, joinPollHandler, leavePollHandler, addPollHandler, closePollHandler };