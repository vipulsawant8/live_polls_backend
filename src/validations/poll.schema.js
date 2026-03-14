import z from "zod";
import ERRORS from "../constants/errors.js";
import { Types } from "mongoose";

const objectIdSchema = z.string().refine(
  (val) => Types.ObjectId.isValid(val),
  { message: ERRORS.POLL_NOT_IDENTIFIED }
);

export const addPollSchema = z.object({
    body:{
        title: z.string().trim().min(1, ERRORS.POLL_DATA_REQUIRED),
        options: z
        .array( z.string().trim().min(1, "Option text is required")
        )
        .min(2, ERRORS.POLL_OPTIONS_LENGTH_MIN)
        .max(6, ERRORS.POLL_OPTIONS_LENGTH_MAX)
    }
});

export const closePollSchema = z.object({
    params: {id: objectIdSchema}
});