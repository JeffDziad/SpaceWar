const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const src = __dirname + '/src/';
const port = 3000;
const { Server } = require('socket.io');
const io = new Server(server);

const game_vars = {
    width: 1000,
    height: 650,
}

// Http request Handler
app.use(express.static(src));

// Socket Handler
io.on('connection', (socket) => {
    console.log('User Connected.');

    socket.emit('game_init', {
        game_vars: game_vars
    });

    socket.on('disconnect', () => {
        console.log('User Disconnected.');
    });
});

// Http Listener
server.listen(port, () => {
    console.log('Server listening on port ' + 3000 + '.');
});