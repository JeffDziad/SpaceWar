const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const src = __dirname + '/src/';
const port = 3000;
const { Server } = require('socket.io');
const io = new Server(server);

class GameRoom {
    constructor(id) {
        this.id = id;
        this.client_count = 0;
        // stores socket objects
        this.clients = [];
    }
    addClient(socket) {
        this.client_count++;
        this.clients.push(socket);
        socket.join(this.getRoomName());
        // Add game room id to socket data.
        socket.data.roomid = this.id;
        socket.data.roomName = this.getRoomName();
        console.log(socket.id + " joined " + this.getRoomName() + ".");
    }
    removeClient(socket, index) {
        this.client_count--;
        this.clients.splice(index, 1);
        socket.leave(this.getRoomName());
        //socket.broadcast.to(socket.data.roomName).emit('opponent-leave', socket);
        console.log(socket.id + " left " + this.getRoomName() + ".");
    }
    validateAndJoin(socket, name, color) {
        for(let i = 0; i < this.clients.length; i++) {
            let c = this.clients[i];
            if(c.data.name == name || c.data.color == color) {
                return false;
            }
        }
        socket.data.name = name;
        socket.data.color = color;
        return true;
    }
    getRoomName() {
        return "gameroom-"+this.id;
    }
}

let game_rooms = [new GameRoom(0)];
const game_vars = {
    width: 1000,
    height: 650,
};

function assignRoom(socket) {
    let found = false;
    for(let i = 0; i < game_rooms.length; i++) {
        if(game_rooms[i].client_count < 4) {
            game_rooms[i].addClient(socket);
            found = true;
            break;
        } 
    }
    if(!found) {
        let gr = new GameRoom(game_rooms.length);
        gr.addClient(socket);
        game_rooms.push(gr);
    }
}

function unassignRoom(socket) {
    for(let i = 0; i < game_rooms.length; i++) {
        let gr = game_rooms[i];
        for(let j = 0; j < gr.clients.length; j++) {
            if(gr.clients[j].id == socket.id) {
                gr.removeClient(socket, j);
                break;
            }
        }
        if(gr.client_count <= 0) {
            game_rooms.splice(i, 1);
        }
    }
}

// Http request Handler
app.use(express.static(src));

// Socket Handler
io.on('connection', (socket) => {
    assignRoom(socket);

    let opponents = io.in(socket.data.roomName).fetchSockets();
    for(let i = 0; i < opponents.length; i++) {
        let o = opponents[i];
        o.emit('first_contact', o);
    }

    socket.emit('game_init', {
        game_vars: game_vars,
        room: socket.data.roomName,
    });

    socket.on('submit-join', (args) => {
        let gr = game_rooms[socket.data.roomid];
        let result = gr.validateAndJoin(socket, args.name, args.color);
        socket.emit('submit-result', result);
    });

    socket.on('register-player', (player) => {
        socket.broadcast.to(socket.data.roomName).emit('register-opponent', {opp: player, socketID: socket.id});
    });

    socket.on('player-update', (player) => {
        socket.broadcast.to(socket.data.roomName).emit('opponent-update', {opp: player, socketID: socket.id});
    });

    socket.on('disconnect', () => {
        socket.broadcast.to(socket.data.roomName).emit('opponent-disconnect', socket.id);
        unassignRoom(socket);
    });
});

// Http Listener
server.listen(port, () => {
    console.log('Server listening on port ' + 3000 + '.');
});