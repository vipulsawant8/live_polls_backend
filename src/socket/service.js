import jwt from "jsonwebtoken";

import pollReceiver from "./receivers/pollReceiver.js";
import { parseCookie } from "cookie";
import logger from "../utils/logger.js";

const socketHandler = (io) => {

	io.use((socket, next) => {

		logger.debug({ cookie: socket.handshake.headers.cookie });

		const cookieHeader = socket.handshake.headers.cookie || "";
		const cookies = parseCookie(cookieHeader);
		const accessToken = cookies.accessToken;

		try {

			const decoded = jwt.verify(
				accessToken,
				process.env.ACCESS_TOKEN_SECRET
			);
			const expiresIn = decoded.exp * 1000 - Date.now();

			setTimeout(() => {
				socket.disconnect(true);
			}, expiresIn);

			socket.on("disconnect", () => {
				clearTimeout(expiresIn);
			});

			socket.userID = decoded.id;
			socket.name = decoded.name;

			return next();

		} catch (error) {

			if (error.name === "TokenExpiredError") {
				return next(new Error("jwt expired"));
			}

			return next(new Error("Unauthorized"));
		}

	});

	io.on('connection', (socket) => {
		logger.info({ socketID: socket.id }, "Connected :")
		pollReceiver(io, socket);
	});
};

export default socketHandler;