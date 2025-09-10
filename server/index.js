const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);

// Configure CORS for Socket.IO
const io = socketIo(server, {
  cors: {
    origin: "*", // Configure this to your React Native app's domain in production
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// Middleware
app.use(cors());
app.use(express.json());

// Store active rooms and users
const activeRooms = new Map();
const userSockets = new Map();

// Basic health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);

  // Handle user joining a room
  socket.on("join-room", (data) => {
    const { roomId, userId } = data;

    console.log(`👤 User ${userId} (${socket.id}) joining room: ${roomId}`);

    // Leave any existing rooms
    Array.from(socket.rooms).forEach((room) => {
      if (room !== socket.id) {
        socket.leave(room);
      }
    });

    // Join the new room
    socket.join(roomId);

    // Store user information
    userSockets.set(socket.id, { userId, roomId });

    // Get or create room info
    if (!activeRooms.has(roomId)) {
      activeRooms.set(roomId, {
        users: new Set(),
        createdAt: new Date(),
        status: "waiting",
      });
    }

    const room = activeRooms.get(roomId);
    room.users.add(socket.id);

    // Notify others in the room
    socket.to(roomId).emit("user-joined", {
      userId,
      socketId: socket.id,
      usersCount: room.users.size,
    });

    // Send current room status to the joining user
    socket.emit("room-joined", {
      roomId,
      usersCount: room.users.size,
      status: room.status,
    });

    console.log(`📊 Room ${roomId} now has ${room.users.size} users`);
  });

  // Handle call initiation (offer)
  socket.on("create-offer", (data) => {
    const { roomId, offer } = data;
    const userInfo = userSockets.get(socket.id);

    console.log(`📞 Creating offer in room: ${roomId}`);

    if (userInfo && userInfo.roomId === roomId) {
      const room = activeRooms.get(roomId);
      if (room) {
        room.status = "calling";

        // Send offer to all other users in the room
        socket.to(roomId).emit("incoming-call", {
          offer,
          callerId: userInfo.userId,
          callerSocketId: socket.id,
          roomId,
        });

        console.log(`📤 Offer sent to room ${roomId}`);
      }
    }
  });

  // Handle call answer
  socket.on("answer-call", (data) => {
    const { roomId, answer, callerSocketId } = data;
    const userInfo = userSockets.get(socket.id);

    console.log(`📞 Answering call in room: ${roomId}`);

    if (userInfo && userInfo.roomId === roomId) {
      const room = activeRooms.get(roomId);
      if (room) {
        room.status = "connected";

        // Send answer to the specific caller
        socket.to(callerSocketId).emit("call-answered", {
          answer,
          answererId: userInfo.userId,
          answererSocketId: socket.id,
          roomId,
        });

        // Notify the room that call is now active
        socket.to(roomId).emit("call-connected", {
          roomId,
          participants: [socket.id, callerSocketId],
        });

        console.log(`✅ Call connected in room ${roomId}`);
      }
    }
  });

  // Handle ICE candidates
  socket.on("ice-candidate", (data) => {
    const { roomId, candidate, targetSocketId } = data;
    const userInfo = userSockets.get(socket.id);

    if (userInfo && userInfo.roomId === roomId) {
      if (targetSocketId) {
        // Send to specific user
        socket.to(targetSocketId).emit("ice-candidate", {
          candidate,
          senderSocketId: socket.id,
          senderId: userInfo.userId,
        });
      } else {
        // Broadcast to all users in room except sender
        socket.to(roomId).emit("ice-candidate", {
          candidate,
          senderSocketId: socket.id,
          senderId: userInfo.userId,
        });
      }

      console.log(`🧊 ICE candidate relayed in room ${roomId}`);
    }
  });

  // Handle call rejection
  socket.on("reject-call", (data) => {
    const { roomId, callerSocketId } = data;
    const userInfo = userSockets.get(socket.id);

    console.log(`❌ Call rejected in room: ${roomId}`);

    if (userInfo && userInfo.roomId === roomId) {
      socket.to(callerSocketId).emit("call-rejected", {
        rejectedBy: userInfo.userId,
        roomId,
      });

      // Reset room status
      const room = activeRooms.get(roomId);
      if (room) {
        room.status = "waiting";
      }
    }
  });

  // Handle call hangup
  socket.on("hangup-call", (data) => {
    const { roomId } = data;
    const userInfo = userSockets.get(socket.id);

    console.log(`📴 Hanging up call in room: ${roomId}`);

    if (userInfo && userInfo.roomId === roomId) {
      // Notify all users in the room about hangup
      socket.to(roomId).emit("call-ended", {
        endedBy: userInfo.userId,
        endedBySocketId: socket.id,
        roomId,
      });

      // Reset room status
      const room = activeRooms.get(roomId);
      if (room) {
        room.status = "waiting";
      }

      console.log(`📴 Call ended in room ${roomId}`);
    }
  });

  // Handle user leaving room
  socket.on("leave-room", () => {
    handleUserDisconnection(socket);
  });

  // Handle user disconnection
  socket.on("disconnect", (reason) => {
    console.log(`🔌 User disconnected: ${socket.id}, reason: ${reason}`);
    handleUserDisconnection(socket);
  });

  // Handle connection errors
  socket.on("error", (error) => {
    console.error(`❌ Socket error for ${socket.id}:`, error);
  });
});

// Helper function to handle user disconnection cleanup
function handleUserDisconnection(socket) {
  const userInfo = userSockets.get(socket.id);

  if (userInfo) {
    const { roomId, userId } = userInfo;

    // Remove user from room
    const room = activeRooms.get(roomId);
    if (room) {
      room.users.delete(socket.id);

      // Notify others in room
      socket.to(roomId).emit("user-left", {
        userId,
        socketId: socket.id,
        usersCount: room.users.size,
      });

      // If this was during a call, end the call
      if (room.status === "calling" || room.status === "connected") {
        socket.to(roomId).emit("call-ended", {
          endedBy: userId,
          endedBySocketId: socket.id,
          roomId,
          reason: "user-disconnected",
        });
        room.status = "waiting";
      }

      // Clean up empty rooms
      if (room.users.size === 0) {
        activeRooms.delete(roomId);
        console.log(`🧹 Cleaned up empty room: ${roomId}`);
      } else {
        console.log(`📊 Room ${roomId} now has ${room.users.size} users`);
      }
    }

    // Remove user from tracking
    userSockets.delete(socket.id);
  }
}

// API endpoints for room management
app.get("/api/rooms", (req, res) => {
  const rooms = Array.from(activeRooms.entries()).map(([roomId, room]) => ({
    roomId,
    usersCount: room.users.size,
    status: room.status,
    createdAt: room.createdAt,
  }));

  res.json({ rooms });
});

app.get("/api/rooms/:roomId", (req, res) => {
  const { roomId } = req.params;
  const room = activeRooms.get(roomId);

  if (room) {
    res.json({
      roomId,
      usersCount: room.users.size,
      status: room.status,
      createdAt: room.createdAt,
    });
  } else {
    res.status(404).json({ error: "Room not found" });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Express error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start the server
const PORT = process.env.PORT || 5050;

server.listen(PORT, () => {
  console.log(`🚀 Video calling server running on port ${PORT}`);
  console.log(`📡 Socket.IO server ready for connections`);
  console.log(`🔗 Health check available at http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("🛑 SIGINT received, shutting down gracefully");
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
});
