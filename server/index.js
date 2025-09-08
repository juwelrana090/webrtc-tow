const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // 🔐 Update in production
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5050;

let users = [];
let peerMap = new Map(); // socket.id → peer socket.id

/**
 * REST Endpoints
 */
app.get("/", (req, res) => {
  res.status(200).send({ status: "success", message: "Server is running" });
});

app.get("/get", (req, res) => {
  res.status(200).send({ status: "success", users });
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

    users = users.filter((u) => u.userId !== userId);
    users.push({ name, userId, socketId: socket.id });

    console.log("👤 Registered:", name, "(", userId, ")");
    io.emit("userList", users);
  });

  /**
   * Call user
   */
  socket.on("callUser", ({ userToCall, signal, from, name }) => {
    console.log(`📞 ${name} calling ${userToCall}`);

    const target = users.find((u) => u.userId === userToCall);
    if (!target) {
      socket.emit("callError", { message: "User not found" });
      return;
    }

    // ✅ Remember who you're calling
    peerMap.set(socket.id, target.socketId);

    io.to(target.socketId).emit("callUser", { signal, from, name });
  });

  /**
   * Answer call
   */
  socket.on("answerCall", ({ signal, to }) => {
    console.log("✅ Answering call to:", to);

    const targetSocketId = users.find((u) => u.userId === to)?.socketId || to;

    // ✅ Remember who you're answering
    peerMap.set(socket.id, targetSocketId);

    io.to(targetSocketId).emit("callAccepted", { signal });
  });

  /**
   * Handle all signals (offer/answer/candidate)
   */
  socket.on("signal", ({ signal }) => {
    if (!signal) return;

    console.log(`📡 Signal [${signal.type}] from ${socket.id}`);

    const targetSocketId = peerMap.get(socket.id);
    if (!targetSocketId) {
      console.log(`❌ No peer found for ${socket.id}`);
      return;
    }

    io.to(targetSocketId).emit("signal", { signal });
  });

  /**
   * Leave call
   */
  socket.on("leaveCall", ({ to }) => {
    console.log(`🚪 ${socket.id} leaving call with ${to}`);

    const targetSocketId = users.find((u) => u.userId === to)?.socketId || to;
    io.to(targetSocketId).emit("leaveCall");

    // Clean up mapping
    peerMap.delete(socket.id);
    peerMap.delete(targetSocketId);
  });

  /**
   * Disconnect
   */
  socket.on("disconnect", () => {
    console.log("🚪 User disconnected:", socket.id);

    users = users.filter((u) => u.socketId !== socket.id);
    io.emit("userList", users);

    // Clean up peer mapping
    peerMap.delete(socket.id);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
