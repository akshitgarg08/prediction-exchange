const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const marketRoutes = require('./routes/markets');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/markets', marketRoutes);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
app.set('io', io);

io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);
  socket.on('joinMarket', (marketId) => {
    socket.join(`market_${marketId}`);
    console.log(`Client ${socket.id} joined market_${marketId}`);
  });
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚀 Exchange Server is running on http://localhost:${PORT}`);
});