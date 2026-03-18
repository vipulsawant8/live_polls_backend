import pino from "pino";
import PinoHttp from "pino-http";

import { randomUUID } from "crypto";

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
  genReqId: (req) => {
    return randomUUID();
  },
  serializers: {
    req(req) {
      return {
        method: req.method,
        url: req.url,
        ip: req.ip,
        id: req.id
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