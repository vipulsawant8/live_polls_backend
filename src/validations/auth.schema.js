import { z } from "zod";
import ERRORS from "../constants/errors.js";

/* ---------------- COMMON HELPERS ---------------- */

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email({ message: ERRORS.BAD_REQUEST });

const passwordSchema = z
  .string()
  .min(6, { message: ERRORS.PASSWORD_TOO_SHORT });

const tokenSchema = z
  .string()
  .min(1, { message: ERRORS.BAD_REQUEST });

/* ---------------- CREATE ACCOUNT ---------------- */

export const createAccountSchema = {
  body: z.object({
    email: emailSchema,
    name: z.string().trim().min(1, { message: ERRORS.MISSING_FIELDS }),
    password: passwordSchema,
  }).strict(),
};


/* ---------------- VERIFY EMAIL ---------------- */

export const verifyEmailSchema = {
  body: z.object({
    token: tokenSchema,
  }).partial()
};


/* ---------------- LOGIN ---------------- */

export const loginUserSchema = {
  body: z.object({
    identity: emailSchema,
    password: z.string().min(1, { message: ERRORS.MISSING_FIELDS }),
    deviceId: z.string().uuid({ message: ERRORS.BAD_REQUEST }),
  }).strict(),
};


/* ---------------- CHANGE PASSWORD ---------------- */

export const changePasswordSchema = {
  body: z.object({
    currentPassword: z.string().min(1, { message: ERRORS.MISSING_FIELDS }),
    newPassword: passwordSchema,
  }).strict(),
};


/* ---------------- FORGOT PASSWORD ---------------- */

export const forgotPasswordSchema = {
  body: z.object({
    email: emailSchema,
  }).strict(),
};


/* ---------------- RESET PASSWORD ---------------- */

export const resetPasswordSchema = {
  body: z.object({
    token: tokenSchema,
    newPassword: passwordSchema,
  }).partial().strict()
};
