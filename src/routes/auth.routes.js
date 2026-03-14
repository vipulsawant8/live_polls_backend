import { Router } from "express";

import { createdUserLimiter, verifyEmailLimiter, loginLimiter, changePasswordLimiter, forgotPasswordLimiter, refreshTokenLimiter, resetPasswordLimiter  } from "../middlewares/limiters/setLimiters.js";
import { validate } from "../middlewares/validate/validate.middleware.js";
import { createAccountSchema, verifyEmailSchema, loginUserSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema } from "../validations/auth.schema.js";
import { getMe, loginUser, logoutUser, createAccount, verifyEmail, refreshAccessToken, changePassword, forgotPassword, resetPassword } from "../controllers/auth.controller.js";
import verifyLogin from "../middlewares/auth/verifyLogin.js";

const router = Router();

/**
 * @swagger
 * /auth/create-account:
 *   post:
 *     summary: Create a new user account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - name
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               name:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Account created successfully
 *       400:
 *         description: Validation error or account exists
 */
router.post('/create-account', createdUserLimiter, validate(createAccountSchema), createAccount);

/**
 * @swagger
 * /auth/verify-email:
 *   post:
 *     summary: Verify user email with token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: Email verified
 *       400:
 *         description: Invalid or expired token
 */
router.post('/verify-email', verifyEmailLimiter, validate(verifyEmailSchema), verifyEmail);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identity
 *               - password
 *               - deviceId
 *             properties:
 *               identity:
 *                 type: string
 *               password:
 *                 type: string
 *               deviceId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', loginLimiter, validate(loginUserSchema), loginUser);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post('/logout', logoutUser);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current logged-in user profile
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Profile fetched successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/me', verifyLogin, getMe);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Session refreshed successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/refresh-token', refreshTokenLimiter,  refreshAccessToken);

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid password
 */
router.post('/change-password', verifyLogin, changePasswordLimiter, validate(changePasswordSchema), changePassword);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset link
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reset email sent if account exists
 */
router.post('/forgot-password', forgotPasswordLimiter, validate(forgotPasswordSchema), forgotPassword);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password using token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post('/reset-password', resetPasswordLimiter, validate(resetPasswordSchema), resetPassword);

export default router;