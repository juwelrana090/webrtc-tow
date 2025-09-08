const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // 🔐 Change in production
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Active users list
let users = [];

// ✅ SIMPLE PEER MAPPING: socket.id → target socket.id
let peerMap = new Map();

/**
 * REST Endpoints
 */
app.get("/", (req, res) => {
  res.status(200).send({ status: "success", message: "Server is running" });
});

app.get("/get", (req, res) => {
  res.status(200).send({ status: "success", message: "Users fetched", users });
});

/**
 * Socket.IO Events
 */
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);
  socket.emit("me", socket.id);

  /**
   * Register user
   */
  socket.on("registerUser", ({ name, userId }) => {
    if (!userId || !name) return;

    users = users.filter((user) => user.userId !== userId);
    const newUser = { name, userId, socketId: socket.id };
    users.push(newUser);

    console.log("👤 Registered:", name, "(", userId, ")");
    io.emit("userList", users);
  });

  /**
   * Get users (optional)
   */
  socket.on("getUsers", () => {
    socket.emit("userList", users);
  });

  /**
   * Call user → offer sent
   */
  socket.on("callUser", ({ userToCall, signal, from, name }) => {
    console.log(`📞 ${name} (${from}) calling ${userToCall}`);

    const targetUser = users.find((u) => u.userId === userToCall);
    if (!targetUser) {
      console.log(`❌ User ${userToCall} not found`);
      socket.emit("callError", { message: "User not found" });
      return;
    }

    // ✅ SIMPLE: Caller remembers who they called
    peerMap.set(socket.id, targetUser.socketId);

    // Forward offer to target
    io.to(targetUser.socketId).emit("callUser", {
      signal,
      from,
      name,
    });
  });

  /**
   * Answer call → answer sent back
   */
  socket.on("answerCall", ({ signal, to }) => {
    console.log("✅ Answering call to:", to);

    const targetSocketId = users.find((u) => u.userId === to)?.socketId || to;

    // ✅ SIMPLE: Callee remembers who they’re answering
    peerMap.set(socket.id, targetSocketId);

    // Send answer back to caller
    io.to(targetSocketId).emit("callAccepted", { signal });
  });

  /**
   * Handle all signals (offer/answer/candidate)
   */
  socket.on("signal", ({ signal }) => {
    if (!signal) return;

    console.log(`📡 Signal from ${socket.id}:`, signal.type);

    // ✅ Forward to whoever this socket last interacted with
    const targetSocketId = peerMap.get(socket.id);
    if (!targetSocketId) {
      console.log(`❌ No peer found for ${socket.id} — can’t forward signal`);
      return;
    }

    io.to(targetSocketId).emit("signal", { signal });
  });

  /**
   * Handle ICE candidate (optional — if you still use this event)
   */
  socket.on("iceCandidate", ({ candidate, to }) => {
    console.log("🧊 Forwarding ICE candidate to:", to);
    const targetSocketId = users.find((u) => u.userId === to)?.socketId || to;
    io.to(targetSocketId).emit("iceCandidate", { candidate });
  });

  /**
   * Leave call
   */
  socket.on("leaveCall", ({ to }) => {
    console.log(`❌ ${socket.id} leaving call with ${to}`);

    const targetSocketId = users.find((u) => u.userId === to)?.socketId || to;
    io.to(targetSocketId).emit("leaveCall");

    // Optional: Clean up peerMap
    peerMap.delete(socket.id);
    peerMap.delete(targetSocketId);
  });

  /**
   * Disconnect
   */
  socket.on("disconnect", () => {
    console.log("🚪", socket.id, "disconnected");

    users = users.filter((user) => user.socketId !== socket.id);
    io.emit("userList", users);

    // Clean up peerMap
    peerMap.delete(socket.id);
  });

  socket.on("error", (error) => {
    console.error("❌ Socket error:", error);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🌐 Socket.IO server ready`);
});
