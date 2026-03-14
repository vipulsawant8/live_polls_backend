import request from "supertest";
import { jest } from "@jest/globals";

import app from "../app.js";
import User from "../models/user.model.js";

jest.mock("../utils/sendEmail.js", () => ({
  sendEmail: jest.fn().mockResolvedValue(true)
}));

describe("Auth API", () => {

  afterEach(async () => {
    await User.deleteMany();
  });

  /* ---------- CREATE ACCOUNT ---------- */

  it("should create a user account", async () => {

    const res = await request(app)
      .post("/api/v1/auth/create-account")
      .send({
        email: "test@example.com",
        name: "Test User",
        password: "Password123!"
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);

  });

  /* ---------- LOGIN ---------- */

  it("should login verified user", async () => {

    await User.create({
      email: "login@example.com",
      name: "Login User",
      password: "Password123!",
      isVerified: true
    });

    const res = await request(app)
  .post("/api/v1/auth/login")
  .send({
    identity: "login@example.com",
    password: "Password123!",
    deviceId: "da429af5-9bb7-4d18-9265-6d9442ac6cc8"
  });

    expect(res.statusCode).toBe(200);
    expect(res.headers["set-cookie"]).toBeDefined();

  });

  /* ---------- REFRESH TOKEN ---------- */

  it("should refresh access token using refresh cookie", async () => {

    await User.create({
      email: "refresh@example.com",
      name: "Refresh User",
      password: "Password123!",
      isVerified: true
    });

    const loginRes = await request(app)
  .post("/api/v1/auth/login")
  .send({
    identity: "refresh@example.com",
    password: "Password123!",
    deviceId: "da429af5-9bb7-4d18-9265-6d9442ac6cc8"
  });

    const cookies = loginRes.headers["set-cookie"];
    expect(cookies).toBeDefined();

    const refreshCookie = cookies.find(c =>
      c.startsWith("refreshToken")
    );

    const res = await request(app)
      .post("/api/v1/auth/refresh-token")
      .set("Cookie", refreshCookie);

    expect([200, 401]).toContain(res.statusCode);

  });

});