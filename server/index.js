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

const PORT = process.env.PORT || 5000;

// Active users list
let users = [];

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
    if (!userId || !name) return;

    console.log("👤 Registering user:", { name, userId, socketId: socket.id });

    // Remove old user with same ID (prevent duplicates)
    users = users.filter((user) => user.userId !== userId);

    // Add new user
    const newUser = { name, userId, socketId: socket.id };
    users.push(newUser);

    console.log("📤 Updated user list:", users);

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
   * Call user
   */
  socket.on("callUser", ({ userToCall, signalData, from, name }) => {
    console.log(`📞 Call initiated: ${name} (${from}) → ${userToCall}`);

    // Find the target user's socket ID
    const targetUser = users.find((user) => user.userId === userToCall);

    if (targetUser) {
      console.log(`📞 Forwarding call to socket: ${targetUser.socketId}`);
      io.to(targetUser.socketId).emit("callUser", {
        signal: signalData,
        from: from,
        name: name,
      });
    } else {
      console.log(`❌ User ${userToCall} not found`);
      // Optionally emit an error back to caller
      socket.emit("callError", { message: "User not found" });
    }
  });

  /**
   * Answer call
   */
  socket.on("answerCall", ({ signal, to }) => {
    console.log("✅ Call answered, forwarding to:", to);
    io.to(to).emit("callAccepted", signal);
  });

  /**
   * Handle ICE candidates
   */
  socket.on("iceCandidate", ({ candidate, to }) => {
    console.log("🧊 ICE candidate forwarded to:", to);
    io.to(to).emit("iceCandidate", { candidate });
  });

  /**
   * Leave call
   */
  socket.on("leaveCall", ({ to }) => {
    console.log("❌ Call ended, notifying:", to);

    // Find the target user's socket ID if 'to' is a userId
    const targetUser = users.find((user) => user.userId === to);
    const targetSocketId = targetUser ? targetUser.socketId : to;

    io.to(targetSocketId).emit("leaveCall");
  });

  /**
   * Handle disconnect
   */
  socket.on("disconnect", () => {
    console.log("🚪 User disconnected:", socket.id);

    // Find and remove user by socketId
    const disconnectedUser = users.find((user) => user.socketId === socket.id);
    users = users.filter((user) => user.socketId !== socket.id);

    console.log("📤 Updated user list after disconnect:", users);

    // Broadcast updated list
    io.emit("userList", users);

    // Notify others that call ended (if they were in a call)
    socket.broadcast.emit("callEnded");
  });

  /**
   * Handle connection errors
   */
  socket.on("error", (error) => {
    console.error("❌ Socket error:", error);
  });
});

/**
 * Start server
 */
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🌐 Socket.IO server ready`);
});
