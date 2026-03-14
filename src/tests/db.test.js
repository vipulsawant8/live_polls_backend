import { jest } from "@jest/globals";
import connectDB from "../db/connectDB.js";
import mongoose from "mongoose";

describe("Database connection", () => {

  it("should exit if database connection fails", async () => {
    const connectMock = jest
      .spyOn(mongoose, "connect")
      .mockRejectedValue(new Error("DB failure"));

    await expect(async () => {
      await connectDB();
    }).rejects.toThrow("DB failure");

    expect(connectMock).toHaveBeenCalled();
    connectMock.mockRestore();
  });

});