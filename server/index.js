const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // 🔐 Change this to your frontend origin in production
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5050;

// Active users list
let users = [];

// Active calls tracking (optional - for better call management)
let activeCalls = new Map();

/**
 * REST Endpoints
 */
// ✅ Health check
app.get("/", (req, res) => {
  res.status(200).send({
    status: "success",
    message: "Server is running",
  });
});

// ✅ Get all users
app.get("/get", (req, res) => {
  res.status(200).send({
    status: "success",
    message: "Users fetched successfully",
    users,
  });
});

/**
 * Helper Functions
 */
function findUserBySocketId(socketId) {
  return users.find((user) => user.socketId === socketId);
}

function findUserByUserId(userId) {
  return users.find((user) => user.userId === userId);
}

function logSignal(signalType, from, to) {
  console.log(`📡 Signal [${signalType}]: ${from} → ${to}`);
}

/**
 * Socket.IO Events
 */
io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  // Send socket ID to client
  socket.emit("me", socket.id);

  /**
   * Register user
   */
  socket.on("registerUser", ({ name, userId }) => {
    if (!userId || !name) {
      console.log("❌ Invalid registration data:", { name, userId });
      return;
    }

    console.log("👤 Registering user:", { name, userId, socketId: socket.id });

    // Remove old user with same ID (prevent duplicates)
    users = users.filter((user) => user.userId !== userId);

    // Add new user
    const newUser = { name, userId, socketId: socket.id };
    users.push(newUser);

    console.log(
      "📤 Updated user list:",
      users.map((u) => `${u.name}(${u.userId})`)
    );

    // Broadcast updated list to all clients
    io.emit("userList", users);
  });

  /**
   * Request user list
   */
  socket.on("getUsers", () => {
    console.log("📤 Sending user list to:", socket.id);
    socket.emit("userList", users);
  });

  /**
   * Call user - Handle initial call offer
   */
  socket.on("callUser", ({ userToCall, signalData, from, name }) => {
    console.log(`📞 Call initiated: ${name} (${from}) → ${userToCall}`);
    console.log(`📞 Signal type: ${signalData?.type}`);

    // Find the target user's socket ID
    const targetUser = findUserByUserId(userToCall);
    const callerUser = findUserBySocketId(socket.id);

    if (!targetUser) {
      console.log(`❌ Target user ${userToCall} not found`);
      socket.emit("callError", { message: "User not found" });
      return;
    }

    if (!callerUser) {
      console.log(`❌ Caller not found in users list`);
      socket.emit("callError", { message: "Caller not registered" });
      return;
    }

    // Validate signal data
    if (!signalData || signalData.type !== "offer") {
      console.log(`❌ Invalid signal data:`, signalData);
      socket.emit("callError", { message: "Invalid offer signal" });
      return;
    }

    // Track active call
    activeCalls.set(socket.id, {
      caller: socket.id,
      callee: targetUser.socketId,
      startTime: Date.now(),
    });

    console.log(`📞 Forwarding call to socket: ${targetUser.socketId}`);
    logSignal(signalData.type, callerUser.name, targetUser.name);

    // Forward the call to target user
    io.to(targetUser.socketId).emit("callUser", {
      signal: signalData,
      from: from,
      name: name,
    });
  });

  /**
   * Answer call - Handle call answer
   */
  socket.on("answerCall", ({ signal, to }) => {
    console.log("✅ Call answered, forwarding answer to:", to);

    const answererUser = findUserBySocketId(socket.id);
    const callerUser = findUserBySocketId(to);

    if (!signal || signal.type !== "answer") {
      console.log(`❌ Invalid answer signal:`, signal);
      return;
    }

    if (answererUser && callerUser) {
      logSignal(signal.type, answererUser.name, callerUser.name);
    }

    // Forward the answer to the original caller
    io.to(to).emit("callAccepted", { signal });
  });

  /**
   * Handle all WebRTC signals (offers, answers, ICE candidates)
   */
  socket.on("signal", ({ signal }) => {
    if (!signal) {
      console.log("❌ Empty signal received");
      return;
    }

    console.log(`📡 Received signal type: ${signal.type}`);

    const senderUser = findUserBySocketId(socket.id);
    let targetSocketId = null;

    // Find the other participant in the call
    const activeCall =
      activeCalls.get(socket.id) ||
      Array.from(activeCalls.values()).find(
        (call) => call.caller === socket.id || call.callee === socket.id
      );

    if (activeCall) {
      // Determine the target socket ID
      targetSocketId =
        activeCall.caller === socket.id ? activeCall.callee : activeCall.caller;
    }

    if (!targetSocketId) {
      console.log("❌ No active call found for signal relay");
      return;
    }

    const targetUser = findUserBySocketId(targetSocketId);

    if (senderUser && targetUser) {
      logSignal(signal.type, senderUser.name, targetUser.name);
    }

    // Forward the signal to the other participant
    io.to(targetSocketId).emit("signal", { signal });
  });

  /**
   * Handle ICE candidates (legacy support)
   */
  socket.on("iceCandidate", ({ candidate, to }) => {
    console.log("🧊 ICE candidate forwarded to:", to);

    const targetUser = findUserByUserId(to) || findUserBySocketId(to);
    const targetSocketId = targetUser ? targetUser.socketId : to;

    io.to(targetSocketId).emit("iceCandidate", { candidate });
  });

  /**
   * Leave call
   */
  socket.on("leaveCall", ({ to }) => {
    console.log("❌ Call ended, notifying:", to);

    const leavingUser = findUserBySocketId(socket.id);

    // Find the target user's socket ID if 'to' is a userId
    const targetUser = findUserByUserId(to) || findUserBySocketId(to);
    const targetSocketId = targetUser ? targetUser.socketId : to;

    if (leavingUser && targetUser) {
      console.log(`❌ ${leavingUser.name} left call with ${targetUser.name}`);
    }

    // Clean up active call tracking
    activeCalls.delete(socket.id);
    for (let [key, call] of activeCalls.entries()) {
      if (call.caller === socket.id || call.callee === socket.id) {
        activeCalls.delete(key);
      }
    }

    // Notify the other participant
    io.to(targetSocketId).emit("leaveCall");
  });

  /**
   * Handle disconnect
   */
  socket.on("disconnect", () => {
    console.log("🚪 User disconnected:", socket.id);

    // Find and remove user by socketId
    const disconnectedUser = findUserBySocketId(socket.id);
    users = users.filter((user) => user.socketId !== socket.id);

    if (disconnectedUser) {
      console.log(
        `👋 ${disconnectedUser.name} (${disconnectedUser.userId}) disconnected`
      );
    }

    // Clean up any active calls
    const activeCall =
      activeCalls.get(socket.id) ||
      Array.from(activeCalls.entries()).find(
        ([_, call]) => call.caller === socket.id || call.callee === socket.id
      );

    if (activeCall) {
      const [callKey, call] = Array.isArray(activeCall)
        ? activeCall
        : [socket.id, activeCall];
      const otherParticipant =
        call.caller === socket.id ? call.callee : call.caller;

      console.log(
        "📞 Ending call due to disconnect, notifying:",
        otherParticipant
      );

      // Notify the other participant
      io.to(otherParticipant).emit("leaveCall");

      // Clean up call tracking
      activeCalls.delete(callKey);
      activeCalls.delete(otherParticipant);
    }

    console.log(
      "📤 Updated user list after disconnect:",
      users.map((u) => `${u.name}(${u.userId})`)
    );

    // Broadcast updated list
    io.emit("userList", users);
  });

  /**
   * Handle connection errors
   */
  socket.on("error", (error) => {
    console.error("❌ Socket error:", error);
  });

  /**
   * Debug endpoint - Get active calls (optional)
   */
  socket.on("getActiveCalls", () => {
    socket.emit("activeCalls", Array.from(activeCalls.entries()));
  });
});

/**
 * Start server
 */
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🌐 Socket.IO server ready`);
  console.log(`📡 WebRTC signaling server initialized`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Server shutting down...");
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});

module.exports = { app, server, io };
