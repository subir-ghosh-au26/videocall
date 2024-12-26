const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors()); // Enable CORS
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join', (room) => {
        socket.join(room);
        console.log(`User ${socket.id} joined room: ${room}`);

        const roomClients = io.sockets.adapter.rooms.get(room);
        const clients = roomClients ? Array.from(roomClients) : [];
        socket.emit('room-clients', clients); //Inform client of all users
        socket.to(room).emit('new-user', socket.id); // Inform other users of a new join
    });


    socket.on('offer', (payload) => {
        socket.to(payload.target).emit('offer', payload);
    });

    socket.on('answer', (payload) => {
        socket.to(payload.target).emit('answer', payload);
    });

    socket.on('ice-candidate', (payload) => {
        socket.to(payload.target).emit('ice-candidate', payload);
    });


    socket.on('disconnect', () => {
        console.log(`User ${socket.id} disconnected`);
        // Handle room leave, if necessary
        io.emit('user-disconnected', socket.id);
    });

});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
