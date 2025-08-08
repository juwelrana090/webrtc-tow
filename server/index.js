const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());

// Socket.io setup with CORS
const io = new Server(server, {
    cors: {
        origin: "*", // Replace with your frontend URL in production
        methods: ["GET", "POST"],
    },
});

// Default route
app.get("/", (req, res) => {
    res.send("Socket.IO WebRTC Signaling Server is running");
});

// Socket.IO connection
io.on("connection", (socket) => {
    console.log("🔌 A user connected:", socket.id);

    // Emit current socket ID to the client
    socket.emit("me", socket.id);

    // Handle call initiation
    socket.on("callUser", ({ userToCall, signalData, from, name }) => {
        console.log(`📞 ${from} is calling ${userToCall}`);
        io.to(userToCall).emit("callUser", { signal: signalData, from, name });
    });

    // Handle call answer
    socket.on("answerCall", ({ to, signal }) => {
        console.log(`✅ Call answered by ${socket.id} to ${to}`);
        io.to(to).emit("callAccepted", signal);
    });

    // Handle call disconnect
    socket.on("disconnect", () => {
        console.log("❌ User disconnected:", socket.id);
        socket.broadcast.emit("callEnded");
    });
});

// Server listen
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
