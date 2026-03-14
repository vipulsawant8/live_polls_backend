import request from "supertest";
import app from "../app.js";

import User from "../models/user.model.js";
import Poll from "../models/poll.model.js";

let agent;
let userData;
let deviceId = "da429af5-9bb7-4d18-9265-6d9442ac6cc8";

const POLL_EXPIRY_WINDOW = 7 * 24 * 60 * 60 * 1000;

beforeAll(async () => {

  agent = request.agent(app);

  userData = {
    email: "polls@test.com",
    name: "Test User",
    password: "Password123!"
  };

  const user = new User({
    ...userData,
    isVerified: true
  });

  await user.save();

  const loginRes = await agent
    .post("/api/v1/auth/login")
    .send({
      identity: userData.email,
      password: userData.password,
      deviceId
    });

  if (loginRes.statusCode !== 200) {
    throw new Error("Login failed during poll test setup");
  }
});

afterEach(async () => {
  await Poll.deleteMany();
});

describe("Polls API", () => {

  test("should fetch polls", async () => {

    const user = await User.findOne({ email: userData.email });

    await Poll.create([
      { title: "Poll A", userID: user._id, options:[{ text: "Option 1", vote: 0, optionID: "12b05c05-482c-4d21-90fd-9c7351b63c95" }, { text: "Option 2", vote: 0, optionID: "6375b8aa-99f4-4c29-b3b5-8d915f2748f6" }], expiresAt: Date.now() + POLL_EXPIRY_WINDOW },
      { title: "Poll B", userID: user._id, options:[{ text: "Option 3", vote: 0, optionID: "0ebcfb6c-e120-462e-9b69-4163c338b3d5" }, { text: "Option 4", vote: 0, optionID: "573045f4-406c-49d2-ab7f-276bc7f1f24b" }], expiresAt: Date.now() + POLL_EXPIRY_WINDOW }
    ]);

    const res = await agent.get("/api/v1/polls");

    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBe(2);
  });

  test("should create poll", async () => {

    const res = await agent
      .post("/api/v1/polls")
      .send({ title: "New Poll", options: ["option 1", "option 2"] });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.title).toBe("New Poll");
  });

  test("should close poll", async () => {

    const user = await User.findOne({ email: userData.email });

    const poll = await Poll.create({ title: "Old", userID: user._id, options:[{ text: "Option 1", vote: 0, optionID: "12b05c05-482c-4d21-90fd-9c7351b63c95" }, { text: "Option 2", vote: 0, optionID: "6375b8aa-99f4-4c29-b3b5-8d915f2748f6" }], expiresAt: Date.now() + POLL_EXPIRY_WINDOW });

    const res = await agent
      .post(`/api/v1/polls/${poll._id}/close`)
      .send({});

    expect(res.statusCode).toBe(200);
    expect(res.body.data.open).toBe(false);
  });

});