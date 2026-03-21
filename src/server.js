import './loadEnv.js';

import http from "http";
import { Server } from 'socket.io';

import app from './app.js';
import connectDB from './db/connectDB.js';
import logger from './utils/logger.js';

import socketHandler from './socket/service.js';

let server;
let io;

const initiateServer = async () => {
	
	try {
    	logger.info("Server initialization started");
		
		server = http.createServer(app);
		const allowedOrigins = process.env.CORS_ORIGIN.split(",");
		io = new Server(server, {
			cors:{
				origin: (origin, callback) => {
					if (!origin || allowedOrigins.includes(origin)) {
						callback(null, true);
					} else {
						callback(new Error("CORS not allowed"));
					}
					},
				credentials: true
			}
		});

		socketHandler(io);

		await connectDB();
    	logger.info("Database connected successfully");

		const PORT = process.env.PORT || 4000;
		// server.listen(PORT, () => {
		await new Promise((resolve) => server.listen(PORT, resolve));
		logger.info({ port: PORT }, "Server running successfully");
		// });
	} catch (error) {
		
		logger.fatal({ err: error }, "Server failed to start");
    	process.exit(1);
	}
};

initiateServer();

let isShuttingDown = false;

const shutdown = async (signal) => {
	
	if (isShuttingDown) return;
	isShuttingDown = true;
	
	logger.warn(`${signal} received. Shutting down gracefully...`);

	try {
		if (io) {
			await new Promise((resolve) => io.close(resolve));
			logger.info("Socket.IO closed");
		}

		if (server) {
			await new Promise((resolve, reject) => {
				server.close((err) => err ? reject(err) : resolve());
			});
			logger.info("HTTP server closed");
		}

		const mongoose = await import("mongoose");
		await mongoose.default.connection.close();
		logger.info("MongoDB connection closed");

		process.exit(0);

	} catch (err) {
		logger.error({ err }, "Error during shutdown");
		process.exit(1);
	}
};

// Handle signals
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);