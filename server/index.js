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

    // Remove old user with same ID (prevent duplicates)
    users = users.filter((user) => user.userId !== userId);

    // Add new user
    const newUser = { name, userId, socketId: socket.id };
    users.push(newUser);

    console.log("👤 User registered:", newUser);

    // Broadcast updated list
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
    console.log(`📞 Call from ${from} → ${userToCall}`);
    io.to(userToCall).emit("callUser", { signal: signalData, from, name });
  });

  /**
   * Answer call
   */
  socket.on("answerCall", (data) => {
    console.log("✅ Call answered by:", data.to);
    io.to(data.to).emit("callAccepted", data.signal);
  });

  /**
   * Leave call
   */
  socket.on("leaveCall", ({ to }) => {
    console.log("❌ Call ended with:", to);
    io.to(to).emit("leaveCall");
  });

  /**
   * Handle disconnect
   */
  socket.on("disconnect", () => {
    console.log("🚪 User disconnected:", socket.id);

    // Remove user by socketId
    users = users.filter((user) => user.socketId !== socket.id);

    // Broadcast updated list
    io.emit("userList", users);

    // Notify others that call ended
    socket.broadcast.emit("callEnded");
  });
});

/**
 * Start server
 */
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
