import e, { json, urlencoded, static as static_ } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from "helmet";
import logger from "./utils/logger.js";
import { httpLogger } from './utils/logger.js';

import authRoutes from "./routes/auth.routes.js";
import pollRoutes from "./routes/poll.routes.js";

import errorHandler from './middlewares/error/errorHandler.middleware.js';

import swaggerUi from "swagger-ui-express";
import swaggerSpec from './config/swagger.js';

const app = e();

app.disable('x-powered-by');
app.set('trust proxy', true);

const allowedOrigins = process.env.CORS_ORIGIN.split(',');
logger.debug({ allowedOrigins }, "CORS configuration loaded");

const corsOptions = {
	origin: function (origin, callback) {
		
		if (!origin) return callback(null, true);
		if (allowedOrigins.indexOf(origin) === -1) {
			const msg = `The CORS policy for this site does not allow access from the specified Origin.`;
			return callback(new Error(msg), false);
		}
		return callback(null, true);
	},
	methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
	credentials: true
};

const urlOptions = {
	limit: "50mb",
	extended: true
};

const jsonOptions = {
	limit: "50mb"
};

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);

app.use((req, res, next) => {
	req.log.debug({ origin: req.headers.origin }, "Incoming request origin");
	next();
});

app.use(cors(corsOptions));

app.use(json(jsonOptions));
app.use(urlencoded(urlOptions));
app.use(static_("public"));

app.use(cookieParser());

app.use(httpLogger);

app.use(`/api-docs`, swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const apiRoute = '/api/v1';

app.use(`${apiRoute}/auth`, authRoutes);
app.use(`${apiRoute}/polls`, pollRoutes);

app.get(`/health`, (req, res) => {
  res.status(200).json({
    status: "OK",
    uptime: process.uptime(),
    timestamp: Date.now()
  });
});

app.use((req, res) => {
	req.log.warn(
		{ method: req.method, url: req.originalUrl },
		"Route not found"
	);
	res.status(404).json({ message: "Route not found", success: false });
});
app.use(errorHandler);

export default app;