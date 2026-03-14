import { RateLimiterMemory } from "rate-limiter-flexible";

export const createSocketLimiter = (
  points,
  duration,
  keyType = "user" // "user" | "ip"
) => {

  const limiter = new RateLimiterMemory({
    points,
    duration
  });

  return async (socket) => {

    let key;

    if (keyType === "user" && socket.userID) {
      key = `user:${socket.userID}`;
    } else {
      key = `ip:${socket.handshake.address}`;
    }

    try {

      await limiter.consume(key);
      return true;

    } catch {

      return false;

    }

  };

};