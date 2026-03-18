import User from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import logger from "../utils/logger.js";

import { setCookieOptions, clearCookieOptions } from "../constants/cookieOptions.js";

import crypto from "crypto";

import jwt from 'jsonwebtoken';
import { sendEmail } from "../utils/sendEmail.js";

const REFRESH_TOKEN_EXPIRY = 14 * 24 * 60 * 60 * 1000;
const VERIFICATION_TOKEN_EXPIRY = 15 * 60 * 1000;

const generateAccessRefreshToken = async ({ userId, deviceId, userAgent, ipAddress }) => {
	const user = await User.findById(userId);

	logger.debug(
		{ userId, deviceId },
		"Generating access and refresh tokens"
	);

	const accessToken = await user.generateAccessToken(deviceId);
	const refreshToken = await user.generateRefreshToken(deviceId);
	const hashedToken = crypto
		.createHash("sha256")
		.update(refreshToken)
		.digest("hex");

		await User.updateOne(
			{ _id: userId },
			{ $pull: { refreshTokens: { deviceId } } }
		);

		await User.updateOne(
			{ _id: userId },
			{
				$push: {
					refreshTokens: {
					$each: [{
						token: hashedToken,
						deviceId,
						userAgent,
						ipAddress,
						createdAt: new Date(),
						expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY)
					}],
					$slice: -5
					}
				}
				}
		);

		// await User.updateOne(
		// 	{ _id: userId },
		// 	{ $pull: { refreshTokens: { deviceId } } }
		// );

		// await User.updateOne(
		// 	{ _id: userId },
		// 	{
		// 		$push: {
		// 		refreshTokens: {
		// 			token: hashedToken,
		// 			deviceId,
		// 			userAgent,
		// 			ipAddress,
		// 			createdAt: new Date(),
		// 			expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY)
		// 		}
		// 		}
		// 	}
		// );

		logger.info(
			{ userId, deviceId },
			"Refresh token stored successfully"
		);

	const tokens = { accessToken, refreshToken };
	return tokens;
};

const clearAndRespond = function (res) {
  return res.status(200)
    .clearCookie('accessToken', clearCookieOptions('accessToken'))
    .clearCookie('refreshToken', clearCookieOptions('refreshToken'))
    .json({ message: "Logged out successfully.", success: true });
};

const createAccount = async (req, res) => {

	const { email, name, password } = req.body;

	req.log.info({ email }, "Account creation attempt");
	if (!email || !name || !password)
		throw new ApiError(400, ERRORS.MISSING_FIELDS);

	let existingUser = await User.findOne({ email });

	// Case 1: User already verified
	if (existingUser && existingUser.isVerified) {
		req.log.warn({ email }, "Account creation failed: already verified");
		throw new ApiError(400, "Account already exists. Please login.");
	}

	// Generate verification token
	const rawToken = crypto.randomBytes(32).toString("hex");
	const hashedToken = crypto
		.createHash("sha256")
		.update(rawToken)
		.digest("hex");

	const tokenExpiry = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY);

	// Case 2: User exists but NOT verified → resend flow
	if (existingUser && !existingUser.isVerified) {

		existingUser.name = name; // optional: update name
		existingUser.password = password; // assume pre-save hashing
		existingUser.verificationToken = hashedToken;
		existingUser.verificationTokenExpiry = tokenExpiry;

		await existingUser.save();

	} else {
		// Case 3: New user
		existingUser = await User.create({
			email,
			name,
			password,
			verificationToken: hashedToken,
			verificationTokenExpiry: tokenExpiry
		});
	}

	const verificationLink =
		`${process.env.CLIENT_URL}/verify-email?token=${rawToken}`;

	await sendEmail({
		to: email,
		subject: "Verify Your Email",
		text: `Click the link to verify your email: ${verificationLink}`
	});
	req.log.info({ email }, "Verification email sent");
	return res.status(201).json({
		success: true,
		message: "Please verify your email to activate your account."
	});
};

const verifyEmail = async (req, res) => {
	req.log.info("Email verification attempt");

	const token = req.query.token || req.body.token;

	if (!token)
		throw new ApiError(400, "Invalid verification request.");

	const hashedToken = crypto
		.createHash("sha256")
		.update(token)
		.digest("hex");

	const user = await User.findOne({
		verificationToken: hashedToken,
		verificationTokenExpiry: { $gt: Date.now() }
	});

	if (!user){
		req.log.warn("Invalid or expired verification token");
		throw new ApiError(400, "Invalid or expired token.");
	}

	if (user.isVerified)
		return res.status(200).json({
			success: true,
			message: "Email already verified."
		});

	user.isVerified = true;
	user.verificationToken = undefined;
	user.verificationTokenExpiry = undefined;

	await user.save();
	req.log.info({ userId: user._id }, "Email verified successfully");

	return res.status(200).json({
		success: true,
		message: "Email verified successfully."
	});
};

const loginUser =  async (req, res) => {

	const identity = req.body.identity;
	const password = req.body.password;
	const deviceId = req.body.deviceId;
	req.log.info(
		{ email: identity, ip: req.ip },
		"Login attempt"
	);

	const user = await User.findOne({ email: identity }).select("-refreshToken");

	if (!user){
		req.log.warn(
			{ email: identity },
			"Login failed: user not found"
		);
		throw new ApiError(401, "Invalid-credentials");
	} 

	if (user && !user.isVerified) throw new ApiError(403, "Please verify your email first.");

	const isPasswordVerified = await user.verifyPassword(password);

	if (!isPasswordVerified) {
		req.log.warn(
			{ email: identity },
			"Login failed: invalid credentials"
		);
		throw new ApiError(401, "Invalid-credentials");}

	const { accessToken, refreshToken } = await generateAccessRefreshToken({ userId: user._id, deviceId, userAgent: req.get('User-Agent') || '', ipAddress: req.ip || req.socket?.remoteAddress || '' });
	req.log.info(
		{ userId: user._id, deviceId },
		"User logged in successfully"
	);
	const response = { message: "Logged in successfully.", data: user, success: true };
	return res.status(200)
	.cookie('accessToken', accessToken, setCookieOptions('accessToken'))
	.cookie('refreshToken', refreshToken, setCookieOptions('refreshToken'))
	.json(response);
};

const logoutUser =  async (req, res) => {
	req.log.info({ ip: req.ip }, "Logout attempt");

	const incomingToken = req.cookies.refreshToken;

	if (!incomingToken) {
		req.log.warn(
			"User logged out no token found"
		);
		return clearAndRespond(res);
	}

	let decodedToken;

	try {
		decodedToken = jwt.verify(
		incomingToken,
		process.env.REFRESH_TOKEN_SECRET
		);
	} catch {
		req.log.warn(
			"User logged out token invalid or expired"
		);
		return clearAndRespond(res);
	}

	const hashedIncomingToken = crypto
		.createHash("sha256")
		.update(incomingToken)
		.digest("hex");

	await User.updateOne(
		{ _id: decodedToken.id },
		{
			$pull: {
				refreshTokens: {
				token: hashedIncomingToken,
				deviceId: decodedToken.deviceId
				}
			}
		}
	);
	req.log.info(
	{ userId: decodedToken.id },
	"User logged out successfully"
	);
	return clearAndRespond(res);
};

const getMe =  async (req, res) => {

	const user = req.user;

	const response = { message: "Profile loaded successfully.", data: user };
	return res.status(200).json(response);
};

const refreshAccessToken =  async (req, res) => {
	req.log.info({ ip: req.ip }, "Refresh token attempt");
	const incomingToken = req.cookies.refreshToken;
	if (!incomingToken) {
		req.log.warn("Refresh token rejected");
		throw new ApiError(401, "Unauthorized");
	}

	let decodedToken;
	try {
		decodedToken = jwt.verify(
		incomingToken,
		process.env.REFRESH_TOKEN_SECRET
		);
	} catch {
		throw new ApiError(401, "Unauthorized");
	}

	const hashedIncomingToken = crypto
		.createHash("sha256")
		.update(incomingToken)
		.digest("hex");

	const user = await User.findOne({
		_id: decodedToken.id,
		refreshTokens: {
			$elemMatch: {
			token: hashedIncomingToken,
			deviceId: decodedToken.deviceId,
			expiresAt: { $gt: new Date() }
			}
		}
	});

	if (!user) throw new ApiError(401, "Unauthorized");
	req.log.info(
		{ userId: user._id },
		"Session refreshed successfully"
	);
	const { accessToken, refreshToken } = await generateAccessRefreshToken({ userId: user._id, deviceId: decodedToken.deviceId, userAgent: req.get('User-Agent') || '', ipAddress: req.ip || req.socket?.remoteAddress || '' });

	return res.status(200)
		.cookie("accessToken", accessToken, setCookieOptions("accessToken"))
		.cookie("refreshToken", refreshToken, setCookieOptions("refreshToken"))
		.json({
			success: true,
			message: "Session extended successfully"
		});
};

const changePassword =  async (req, res) => {
	const user = req.user;
	req.log.info(
		{ userId: user._id },
		"Password change attempt"
	);

	const { currentPassword, newPassword } = req.body;

	const checkcurrentPassword = await user.verifyPassword(currentPassword);
	if (!checkcurrentPassword) {
		req.log.warn(
			{ userId: user._id },
			"Password change failed: incorrect current password"
		);
		throw new ApiError(400, "Current Password is incorrect");
	}

	const checkNewPassword = await user.verifyPassword(newPassword);
	if (checkNewPassword) throw new ApiError(400, "New Password cannot be same as Current Password");

	user.password = newPassword;
	await user.save();
	
	await User.updateOne(
		{ _id: user._id },
		{ $pull: { refreshTokens: { deviceId: { $ne: user.deviceId } } } }
	);
	
	const { accessToken, refreshToken } = await generateAccessRefreshToken({ userId: user._id, deviceId: user.deviceId, userAgent: req.get('User-Agent') || '', ipAddress: req.ip || req.socket?.remoteAddress || '' });
	req.log.info(
		{ userId: user._id },
		"Password changed successfully"
	);
	const response = { message: "Password was Changed Successfully", success: true };
	return res.status(200)
	.cookie('accessToken', accessToken, setCookieOptions('accessToken'))
	.cookie('refreshToken', refreshToken, setCookieOptions('refreshToken'))
	.json(response);
};

const forgotPassword =  async (req, res) => {
	const { email } = req.body;
	req.log.info({ email }, "Password reset request received");
	
	const user = await User.findOne({ email });
	if (user) {
		const rawToken = crypto.randomBytes(32).toString("hex");
		const hashedToken = crypto
			.createHash("sha256")
			.update(rawToken)
			.digest("hex");
		const tokenExpiry = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY);
		
		user.passwordResetToken = hashedToken;
		user.passwordResetExpiry = tokenExpiry;
		await user.save();

		const verificationLink =
		`${process.env.CLIENT_URL}/reset-password?token=${rawToken}`;

		await sendEmail({
			to: email,
			subject: "Forget Password Attemp",
			text: `Click the link to reset your password: ${verificationLink}`
		});
	}
	req.log.info({ email }, "Password reset email sent");
	const response = { success:true, message: "If an account with that email exists, a reset link has been sent." };
	return res.json(response);
};

const resetPassword =  async (req, res) => {
	req.log.info("Password reset attempt");

	const token = req.body.token || req.query.token;
	const newPassword = req.body.newPassword;
	
	const hashedToken = crypto
		.createHash("sha256")
		.update(token)
		.digest("hex");

	const user = await User.findOne({
		passwordResetToken: hashedToken,
		passwordResetExpiry: { $gt: Date.now() }
	});
	if (!user) {
		req.log.warn("Invalid password reset token");
		throw new ApiError(400, "Invalid or expired token.");
	}

	user.password = newPassword;
	user.refreshTokens = [];
	user.passwordResetToken = undefined;
	user.passwordResetExpiry = undefined;
	await user.save();
	req.log.info(
		{ userId: user._id },
		"Password reset successfully"
	);
	const response = { message: "Password was Reset", success: true };
	return res.status(200)
	.json(response);
};

export { createAccount, verifyEmail, loginUser, logoutUser, getMe, refreshAccessToken, changePassword, forgotPassword, resetPassword };