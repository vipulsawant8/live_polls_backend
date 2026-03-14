import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import ApiError from "../../utils/ApiError.js";

export const createLimiter = (
	windowMs,
	max,
	message,
	keyType = "ip",          // "ip" | "email" | "user"
	countOnlySuccess = false // if true → only count responses < 400
) =>
	rateLimit({
		windowMs,
		max,

		keyGenerator: (req) => {
			/* ---- Per Authenticated User ---- */
			if (keyType === "user" && req.user?._id) {
				return `user:${req.user._id.toString()}`;
			}

			/* ---- Per Email (Login / Register) ---- */
			if (keyType === "email" && req.body?.email) {
				return `email:${req.body.email.trim().toLowerCase()}`;
			}

			/* ---- Default: IP ---- */
			return `ip:${ipKeyGenerator(req.ip)}`;
		},

		/* ---- Only Count Successful Requests (Optional) ---- */
		skip: (req, res) => {
			if (!countOnlySuccess) return false;
			return res.statusCode >= 400;
		},

		handler: (req, res, next) => {
			next(new ApiError(429, message));
		},

		standardHeaders: true,
		legacyHeaders: false,
	});

export const createdUserLimiter = createLimiter(
	15 * 60 * 1000,
	5,
	"Too many registration attempts. Try again later.",
	"email"
);

export const verifyEmailLimiter = createLimiter(
	15 * 60 * 1000,
	20,
	"Too many verification attempts. Try again later."
);

export const loginLimiter = createLimiter(
	15 * 60 * 1000,
	5,
	"Too many login attempts. Try again later.",
    "email"
);

export const forgotPasswordLimiter = createLimiter(
	60 * 60 * 1000,
	5,
	"Too many reset requests. Please try again later.",
    "email"
);

export const resetPasswordLimiter = createLimiter(
	60 * 60 * 1000,
	10,
	"Too many reset requests. Please try again later.",
);

export const changePasswordLimiter = createLimiter(
	15 * 60 * 1000,
	5,
	"Too many password change attempts.",
	"user"
);

export const refreshTokenLimiter = createLimiter(
	15 * 60 * 1000,
	20,
	"Too many token refresh attempts. Please try again later."
);

export const addPollLimiter = createLimiter(
	60 * 60 * 1000,
	3,
	"Can Add 3 polls per hour",
	"user",
	true
);

// Anti-spam
export const burstLimiter = createLimiter(
	5 * 60 * 1000,
	20,
	"Too many requests. Slow down.",
	"user"
);