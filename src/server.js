import './loadEnv.js';

import http from "http";
import { Server } from 'socket.io';

import app from './app.js';
import connectDB from './db/connectDB.js';
import logger from './utils/logger.js';

import socketHandler from './socket/service.js';

const initiateServer = async () => {
	
	try {
    	logger.info("Server initialization started");
		
		const server = http.createServer(app);
		const allowedOrigins = process.env.CORS_ORIGIN.split(",");
		const io = new Server(server, {
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
		server.listen(PORT, () => {

			logger.info({ port: PORT }, "Server running successfully");
		});
	} catch (error) {
		
		logger.fatal({ err: error }, "Server failed to start");
    	process.exit(1);
	}
};

initiateServer();