// src/loadEnv.js
import dotenvFlow from "dotenv-flow";
import logger from "./utils/logger.js";

dotenvFlow.config({
	silent: process.env.NODE_ENV === "production"
});

logger.info({env: process.env.NODE_ENV},"Environment loaded -> NODE_ENV");
