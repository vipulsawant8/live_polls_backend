import { createSocketLimiter } from "./createSocketLimiter.js";

export const voteLimiter = createSocketLimiter(
  3,   // max votes
  60,  // per 10 seconds
  "user"
);

export const pollActionLimiter = createSocketLimiter(
  20,
  60,
  "user"
);