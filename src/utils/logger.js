import pino from "pino";
import PinoHttp from "pino-http";

const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  transport:
    process.env.NODE_ENV !== "production"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true
          }
        }
      : undefined
});

export const httpLogger = PinoHttp({
  logger,
  serializers: {
    req(req) {
      return {
        method: req.method,
        url: req.url,
        ip: req.ip
      };
    },
    res(res) {
      return {
        statusCode: res.statusCode
      };
    }
  }
});

export default logger;