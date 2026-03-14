import { io as Client } from "socket.io-client";
import http from "http";
import mongoose from "mongoose";
import { Server } from "socket.io";
import request from "supertest";

import app from "../app.js";
import Poll from "../models/poll.model.js";
import User from "../models/user.model.js";
import { POLL_EVENTS } from "../socket/events/pollEvents.js";
import socketHandler from "../socket/service.js";

let io;
let server;
let clientSocket;
let agent;
let cookie;
let testUser;
beforeAll(async () => {

  agent = request.agent(app);

  testUser = await User.create({
    name: "TestUser",
    email: "test@test.com",
    password: "password123",
    isVerified: true
  });

  const res = await agent
    .post("/api/v1/auth/login")
    .send({
      identity: "test@test.com",
      password: "password123",
      deviceId: "573045f4-406c-49d2-ab7f-276bc7f1f24b"
    });

  cookie = res.headers["set-cookie"][0].split(";")[0];
});

beforeEach((done) => {

 server = http.createServer();

  io = new Server(server);
  socketHandler(io);

  server.listen(() => {

    const port = server.address().port;

    clientSocket = new Client(`http://localhost:${port}`, {
      extraHeaders: {
        Cookie: cookie
      }
    });

    clientSocket.once("connect", done);

  });
});

afterEach(() => {
  
  if (clientSocket) clientSocket.close();
  if (io) io.close();
  if (server) server.close();
});

test("joinPoll returns poll data when poll is active", (done) => {

  Poll.create({
    title: "Test poll",
    options: [
      { text: "Option 1", votes: 0, optionID: "opt1" },
      { text: "Option 2", votes: 0, optionID: "opt2" }
    ],
    userID: testUser._id,
    expiresAt: new Date(Date.now() + 60000)
  }).then((poll) => {

    clientSocket.once(POLL_EVENTS.UPDATE_POLL_DATA, ({ poll: received }) => {
      expect(received._id.toString()).toBe(poll._id.toString());
      done();
    });

    clientSocket.emit(POLL_EVENTS.JOIN_POLL, { pollID: poll._id });

  });

});

test("joinPoll returns POLL_CLOSED if poll expired", (done) => {

  Poll.create({
    title: "Closed poll",
    options: [{ text: "A", votes: 0, optionID: "opt1" },{ text: "B", votes: 0, optionID: "opt2" }],
    userID: testUser._id,
    expiresAt: new Date(Date.now() - 1000)
  }).then((poll) => {

    clientSocket.once(POLL_EVENTS.POLL_CLOSED, ({ pollID }) => {
      expect(pollID.toString()).toBe(poll._id.toString());
      done();
    });

    clientSocket.emit(POLL_EVENTS.JOIN_POLL, { pollID: poll._id });

  });

});

test("castVote accepts valid vote", (done) => {

  Poll.create({
    title: "Vote poll",
    options: [{ text: "A", votes: 0, optionID: "opt1" }, { text: "B", votes: 0, optionID: "opt3" }],
    userID: testUser._id,
    expiresAt: new Date(Date.now() + 60000)
  }).then((poll) => {

    const option = poll.options[0];

    clientSocket.once(POLL_EVENTS.VOTE_ACCEPTED, ({ message }) => {
      expect(message).toBe("Vote counted");
      done();
    });

    clientSocket.emit(POLL_EVENTS.JOIN_POLL, { pollID: poll._id });

    clientSocket.emit(POLL_EVENTS.CAST_VOTE, {
      pollID: poll._id,
      optionID: option.optionID,
      optionDocID: option._id
    });

  });

});

test("duplicate vote is rejected", (done) => {

  Poll.create({
    title: "Duplicate vote poll",
    options: [{ text: "A", votes: 0, optionID: "opt1" }, { text: "B", votes: 0, optionID: "opt2" }],
    userID: testUser._id,
    expiresAt: new Date(Date.now() + 60000)
  }).then((poll) => {

    const option = poll.options[0];

    clientSocket.once(POLL_EVENTS.VOTE_REJECTED, ({ message }) => {
      expect(message).toBe("Vote already casted");
      done();
    });

    clientSocket.emit(POLL_EVENTS.JOIN_POLL, { pollID: poll._id });

    clientSocket.emit(POLL_EVENTS.CAST_VOTE, {
      pollID: poll._id,
      optionID: option.optionID,
      optionDocID: option._id
    });

    clientSocket.emit(POLL_EVENTS.CAST_VOTE, {
      pollID: poll._id,
      optionID: option.optionID,
      optionDocID: option._id
    });

  });

});