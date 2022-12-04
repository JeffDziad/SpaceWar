window.onload = () => {

    // Game Constants
    const socket = io(),
        canvas = document.getElementById('space-war'),
        ctx = canvas.getContext('2d');

    // HTML Constants
    const leaderboard = document.getElementById('leaderboard'),
        join_modal = document.getElementById('join-modal'),
        join_btn = document.getElementById('join-btn'),
        join_modal_close = document.getElementsByClassName('modal-close')[0],
        player_name = document.getElementById('player-name'),
        player_color = document.getElementById('player-color'),
        waiting_submit = document.getElementById('waiting-submit'),
        submit_player = document.getElementById('submit-join'),
        connection_status = document.getElementById('connection-status'),
        join_error = document.getElementById('join-error');

    // Join Modal Events
    join_btn.addEventListener('click', function() {
        join_modal.style.display = 'block'; 
        join_btn.disabled = true;
    });
    join_modal_close.addEventListener('click', function() {
        join_modal.style.display = 'none'; 
        join_btn.disabled = false;
    });
    submit_player.addEventListener('click', function(){
        submit_player.style.display = 'none';
        waiting_submit.style.display = 'inline-block';
        socket.emit('submit-join', {name: player_name.value, color: player_color.value});
    });
        
    let width, 
        height, 
        player, 
        current_room = 'None',
        join_success = false,
        opponent_timeout = 2000;
        opponents = [];

    socket.on('game_init', (data) => {
        let d = data.game_vars;
        //opponents = 
        current_room = data.room;
        connection_status.style.color = 'green';
        connection_status.innerHTML = current_room;
        width = canvas.width = d.width;
        height = canvas.height = d.height;
        init();
    });

    socket.on('submit-result', (result) => {
        if(result) joinGame();
        else {
            // Failed join
            player_name.value = "";
            player_color.value = "red";
            join_error.style.display = "inline-block";
            waiting_submit.style.display = 'none';
            submit_player.style.display = 'inline-block';
        }
    });

    socket.on('first-broadcast', () => {
        registerPlayer();
    });

    socket.on('register-opponent', (data) => {
        let found = false
        for(let i = 0; i < opponents.length; i++) {
            if(opponents[i].stocketID == data.socketID) found = true;
        }
        if(!found) {
            opponents.push(new Opponent(data.socketID, data.opp));
        }
    });

    socket.on('opponent-update', (data) => {
        let found = false;
        for(let i = 0; i < opponents.length; i++) {
            
            if(opponents[i].socketID == data.socketID) {
                opponents[i].lastUpdate = performance.now();
                opponents[i].od = data.opp;
                found = true;
            }
        }
        if(!found) {
            opponents.push(new Opponent(data.socketID, data.opp));
        }
    });

    class Opponent {
        constructor(socketID, oppData) {
            this.lastUpdate = performance.now();
            this.socketID = socketID;
            // {
            //     isOpponent: false,
            //     created: 10887,   
            //     recent: 10887,    
            //     radius: 25,       
            //     angle: 0,
            //     colors: { body: 'red', front_indicator: 'white' },
            //     pos: { x: 500, y: 325 },
            //     points: { p1: 0, p2: 0, p3: 0 },
            //     dirs: { foward: false, reverse: false, left: false, right: false },
            //     vel: { x: 0, y: 0 },
            //     acc: { x: 0, y: 0 },
            //     rotate_speed: 3,
            //     acc_speed: 0.1,
            //     drag: 0.99,
            //     wall_force: 1
            //   }
            this.od = oppData;
        }
        draw() {
            // calculate point positions
            let r1 = (this.od.angle * Math.PI) / 180;
            this.od.points.p1 = {
                x: this.od.pos.x + Math.cos(r1) * this.od.radius,
                y: this.od.pos.y + Math.sin(r1) * this.od.radius
            };
            let r2 = ((this.od.angle + 120) * Math.PI) / 180;
            this.od.points.p2 = {
                x: this.od.pos.x + Math.cos(r2) * this.od.radius,
                y: this.od.pos.y + Math.sin(r2) * this.od.radius
            };
            let r3 = ((this.od.angle + 240) * Math.PI) / 180;
            this.od.points.p3 = {
                x: this.od.pos.x + Math.cos(r3) * this.od.radius,
                y: this.od.pos.y + Math.sin(r3) * this.od.radius
            };
            // draw point positions - body triangle
            ctx.fillStyle = this.od.colors.body;
            ctx.beginPath();
            ctx.moveTo(this.od.points.p1.x, this.od.points.p1.y);
            ctx.lineTo(this.od.points.p2.x, this.od.points.p2.y);
            ctx.lineTo(this.od.points.p3.x, this.od.points.p3.y);
            ctx.lineTo(this.od.points.p1.x, this.od.points.p1.y);
            ctx.fill();
            // draw front indicator - line from center to head
            ctx.strokeWeight = 2;
            ctx.strokeStyle = this.od.colors.front_indicator;
            ctx.beginPath();
            ctx.moveTo(this.od.pos.x, this.od.pos.y);
            ctx.lineTo(this.od.points.p1.x, this.od.points.p1.y);
            ctx.stroke();
        }
        update() {
            this.draw();
        }
    }

    class Player {
        constructor(iX, iY, body_color) {
            this.created = performance.now();
            this.recent = this.created;
            // equilateral triangle
            this.radius = 25;
            this.angle = 0;
            this.score = 0;
            // general variables
            this.colors = {
                body: body_color,
                front_indicator: "white",
            };
            this.pos = {
                x: iX,
                y: iY
            };
            this.points = {
                p1: 0, 
                p2: 0,
                p3: 0
            };
            this.dirs = {
                foward: false,
                reverse: false,
                left: false,
                right: false
            };
            this.vel = {
                x: 0,
                y: 0
            };
            this.acc = {
                x: 0,
                y: 0 
            };
            this.rotate_speed = 3;
            this.acc_speed = 0.1;
            this.drag = 0.99;
            this.wall_force = 1;
            this.initEvents();
        }
        initEvents() {
            addEventListener('keydown', (e) => {
                if(e.key == "w") this.forward = true;
                if(e.key == "s") this.reverse = true;
                if(e.key == "a") this.left = true;
                if(e.key == "d") this.right = true;
            });
            addEventListener('keyup', (e) => {
                if(e.key == "w") this.forward = false;
                if(e.key == "s") this.reverse = false;
                if(e.key == "a") this.left = false;
                if(e.key == "d") this.right = false;
            });
        }
        draw() {
            // calculate point positions
            let r1 = (this.angle * Math.PI) / 180;
            this.points.p1 = {
                x: this.pos.x + Math.cos(r1) * this.radius,
                y: this.pos.y + Math.sin(r1) * this.radius
            };
            let r2 = ((this.angle + 120) * Math.PI) / 180;
            this.points.p2 = {
                x: this.pos.x + Math.cos(r2) * this.radius,
                y: this.pos.y + Math.sin(r2) * this.radius
            };
            let r3 = ((this.angle + 240) * Math.PI) / 180;
            this.points.p3 = {
                x: this.pos.x + Math.cos(r3) * this.radius,
                y: this.pos.y + Math.sin(r3) * this.radius
            };
            // draw point positions - body triangle
            ctx.fillStyle = this.colors.body;
            ctx.beginPath();
            ctx.moveTo(this.points.p1.x, this.points.p1.y);
            ctx.lineTo(this.points.p2.x, this.points.p2.y);
            ctx.lineTo(this.points.p3.x, this.points.p3.y);
            ctx.lineTo(this.points.p1.x, this.points.p1.y);
            ctx.fill();
            // draw front indicator - line from center to head
            ctx.strokeWeight = 2;
            ctx.strokeStyle = this.colors.front_indicator;
            ctx.beginPath();
            ctx.moveTo(this.pos.x, this.pos.y);
            ctx.lineTo(this.points.p1.x, this.points.p1.y);
            ctx.stroke();
        }
        draw_thrust() {
            //? Implement thrust particles later, should be encapsulated in player class. 
            // if((performance.now() - this.recent) > this.thrust_delay) {
            //     let dist_mag = 1;
            //     let distX = this.points.p3.x - this.points.p2.x,
            //         distY = this.points.p3.y - this.points.p2.y,
            //         iX = (distX * dist_mag) + this.points.p2.x,
            //         iY = (distY * dist_mag) + this.points.p2.y;
            //     let randAngle = rand(-15, 15);
            //     let r0 = ((this.angle + randAngle) * Math.PI) / 180;
            //     let vX = -(Math.cos(r0) * this.thrust_speed),
            //         vY = -(Math.sin(r0) * this.thrust_speed);
            //     thrust_particles.push(new Particle(performance.now(), iX, iY, {r: 255, g: 255, b: 255}, 2, {x:vX, y:vY}, {x:0, y:0}, true, 500));
            //     this.recent = performance.now();
            // }
        }
        update() {
            let r0 = (this.angle * Math.PI) / 180;
            // accelerate if there is movement input
            if(this.forward && !this.reverse) {
                // move forward
                this.acc.x = Math.cos(r0) * this.acc_speed;
                this.acc.y = Math.sin(r0) * this.acc_speed;

            } else if(this.reverse && !this.forward) {
                // move in reverse
                this.acc.x = -(Math.cos(r0) * (this.acc_speed/2));
                this.acc.y = -(Math.sin(r0) * (this.acc_speed/2));
            }
            if(this.left && !this.right) {
                // rotate left
                this.angle -= this.rotate_speed;

            } else if(this.right && !this.left) {
                // rorate right
                this.angle += this.rotate_speed;
            }

            // apply acceleration to velocity
            this.vel.x += this.acc.x;
            this.vel.y += this.acc.y;

            // apply drag to velocity - slows player after no input
            this.vel.x *= this.drag;
            this.vel.y *= this.drag;

            // update position
            this.pos.x += this.vel.x;
            this.pos.y += this.vel.y;

            // reset acceleration
            this.acc.x = 0;
            this.acc.y = 0;

            this.wallCollisions();
            this.draw();
        }
        applyForce(x=0, y=0) {
            this.acc.x += x;
            this.acc.y += y;
        }
        wallCollisions() {
            // handle wall collisions
            // if there is a wall collision:
            // 1. get angle of player relative to the wall they're approaching 
            // 2. remove all velocity
            // 3. apply negative velocity to bounch player off wall
            for(const prop in this.points) {
                let p = this.points[prop]; // { x, y }
                if(p.x > width) {
                    this.vel.x = 0;
                    this.pos.x = this.pos.x-1;
                    this.applyForce(-this.wall_force, 0);
                } else if(p.x <= 0) {
                    this.vel.x = 0;
                    this.pos.x = this.pos.x+1;
                    this.applyForce(this.wall_force, 0);
                }
                if(p.y > height) {
                    this.vel.y = 0;
                    this.pos.y = this.pos.y-1;
                    this.applyForce(0, -this.wall_force);
                } else if(p.y <= 0) {
                    this.vel.y = 0;
                    this.pos.y = this.pos.y+1;
                    this.applyForce(0, this.wall_force);
                }
            }
        }
    }

    function init() {
        leaderboard.style.width = `${width}px`;
        animate();
    }

    function joinGame() {
        join_modal.style.display = 'none';
        join_btn.style.disabled = true;
        player = new Player(width/2, height/2, player_color.value);
        registerPlayer();
        join_success = true;
    }

    function registerPlayer() {
        socket.emit('register-player', player);
    }

    function rand(min, max, floor=true) {
        if(floor) return Math.floor(Math.random() * (max-min) + min);
        else return Math.random() * (max-min) + min;
        
    }

    function bgFill(color) {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, width, height);
    }

    function strokeBounds(color) {
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(width, 0);
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.lineTo(0, 0);
        ctx.stroke();
    }

    function sendPlayerUpdate() {
        // Send player information to all other player
        socket.emit('player-update', player);
    }

    function updateOpponents() {
        for(let i = 0; i < opponents.length; i++) {
            if(performance.now() - opponents[i].lastUpdate > opponent_timeout) {
                opponents.splice(i, 1);
                break;
            }
            opponents[i].update();
        }
    }

    function animate() {
        bgFill('black');
        if(player) player.update();
        if(join_success) sendPlayerUpdate();
        updateOpponents();
        requestAnimationFrame(animate);
    }
}