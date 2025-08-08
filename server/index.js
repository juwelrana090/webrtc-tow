const app = require("express")();
const server = require("http").createServer(app);
const cors = require("cors");

const io = require("socket.io")(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

app.use(cors());


const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
    res.send("Server is running");
});


io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.emit('me', socket.id);

    socket.on('disconnect', () => {
        socket.broadcast.emit('callEnded');
        console.log('User disconnected:', socket.id);
    });

    socket.on('callUser', ({ userToCall, signalData, from, name }) => {
        console.log('Call user:', userToCall, signalData,);
        console.log('Call signal:', signalData);
        console.log('Call from:', from);
        console.log('Call name:', name);
        io.to(userToCall).emit('callUser', { signal: signalData, from, name });
    });

    socket.on('answerCall', (data) => {
        console.log('Answer call:', data);
        io.to(data.to).emit('callAccepted', data.signal);
    });

    socket.on("callEnded", (to) => {
        console.log("Call ended");
        io.to(to).emit('callEnded');
    });


});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});