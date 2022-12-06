window.onload = () => {

    // Game Constants
    const socket = io(),
        canvas = document.getElementById('space-war'),
        ctx = canvas.getContext('2d');

    // HTML Constants
    const leaderboard_div = document.getElementById('leaderboard'),
        leaderboard_entries_div = document.getElementById('leaderboard-entries'),
        join_modal = document.getElementById('join-modal'),
        join_btn = document.getElementById('join-btn'),
        join_modal_close = document.getElementsByClassName('modal-close')[0],
        player_name = document.getElementById('player-name'),
        player_color = document.getElementById('player-color'),
        waiting_submit = document.getElementById('waiting-submit'),
        submit_player = document.getElementById('submit-join'),
        connection_status = document.getElementById('connection-status'),
        join_error = document.getElementById('join-error'),
        score_div = document.getElementById('score-div');

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
        opponent_timeout = 60000; // timeout after a minute of no new input
        opponents = [],
        leaderboard = new Leaderboard();

    socket.on('game_init', (data) => {
        let d = data.game_vars;
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

    socket.on('register-opponent', (data) => {
        let found = false
        for(let i = 0; i < opponents.length; i++) {
            if(opponents[i].stocketID == data.socketID) found = true;
        }
        if(!found) {
            opponents.push(new Opponent(data.socketID, data.opp));
        }
    });

    socket.on('opponent-disconnect', (id) => {
        leaderboard.removeEntry(id);
        for(let i = 0; i < opponents.length; i++) {
            console.log(opponents[i].socketID + " leaving.");
            if(opponents[i].socketID == id) opponents.splice(i, 1);
            break;            
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

    // Global Listeners
    addEventListener('resize', () => {
        positionScoreDiv();
    });

    class Projectile {
        constructor(owner, color, startX, startY, iVelX, iVelY, fireAngle) {
            this.id = performance.now();
            // owner = socketID
            this.owner = owner;
            this.pos = {
                x: startX,
                y: startY
            };
            this.vel = {
                x: iVelX,
                y: iVelY
            }
            this.angle = fireAngle;
            this.speed = 6;
            this.color = color;
            this.radius = 4;
        }
        draw() {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, this.radius, 0, 2 * Math.PI, false);
            ctx.fill();
        }
        update() {
            let r0 = (this.angle * Math.PI) / 180;
            this.pos.x += (Math.cos(r0) * this.speed) + this.vel.x;
            this.pos.y += (Math.sin(r0) * this.speed) + this.vel.y;
            this.draw();
        }
    }

    class Opponent {
        constructor(socketID, oppData) {
            this.lastUpdate = performance.now();
            this.socketID = socketID;
            this.od = oppData;

            this.projectiles = [];
            this.last_projectile_count = this.projectiles.length;

            // Initialize leaderboard placement
            leaderboard.addEntry(this.socketID, this.od.player_name, this.od.colors.body, this.od.score);
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

            //Update Leaderboard Score
            leaderboard.updateEntry(this.socketID, this.od.score);
        }
        drawProjectiles() {
            // for(let i = 0; i < this.od.projectiles.length; i++) {
                
            //     let p = new Projectile(this.socketID, this.od.colors.body,
            //         this.od.points.p1.x+5, this.od.points.p1.y+5, this.od.vel.x, this.od.vel.y, this.od.angle);
            //     console.log(p);
            //     p.draw();
            //     // ctx.fillColor = "red";
            //     // ctx.beginPath();
            //     // ctx.arc(this.od.projectiles[i].pos.x, this.od.projectiles[i].pos.y, 4, 0, 2 * Math.PI, false);
            //     // ctx.fill();
            // }
        }
        update() {
            this.drawProjectiles();
            this.draw();
        }
    }

    class Player {
        constructor(socketID, playerName, iX, iY, body_color) {
            this.socketID = socketID;
            this.player_name = playerName;
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
            this.controls = {
                foward: false,
                reverse: false,
                left: false,
                right: false,
                shoot: false,
            };
            this.vel = {
                x: 0,
                y: 0
            };
            this.acc = {
                x: 0,
                y: 0 
            };
            this.shot_recoil = 2;
            this.rotate_speed = 3;
            this.acc_speed = 0.1;
            this.drag = 0.99;
            this.wall_force = 1;
            this.initEvents();

            // weapons 
            this.projectiles = [];

            // Initialize leaderboard placement
            leaderboard.addEntry(this.socketID, this.player_name, this.colors.body, this.score);
        }
        initEvents() {
            addEventListener('keydown', (e) => {
                if(e.key == "w") this.controls.forward = true;
                if(e.key == "s") this.controls.reverse = true;
                if(e.key == "a") this.controls.left = true;
                if(e.key == "d") this.controls.right = true;
            });
            addEventListener('keypress', (e) => {
                if(e.code == "Space") this.controls.shoot = true;
            });
            addEventListener('keyup', (e) => {
                if(e.key == "w") this.controls.forward = false;
                if(e.key == "s") this.controls.reverse = false;
                if(e.key == "a") this.controls.left = false;
                if(e.key == "d") this.controls.right = false;
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
        
            //Update Leaderboard Score
            leaderboard.updateEntry(this.socketID, this.score);
            //Update score in score-div
            this.drawScore();
        }
        shoot() {
            this.projectiles.push(new Projectile(this.socketID, this.colors.body, this.points.p1.x, this.points.p1.y, this.vel.x, this.vel.y, this.angle));
            let r0 = (this.angle * Math.PI) / 180;
            this.vel.x += -(Math.cos(r0) * (this.shot_recoil));
            this.vel.y += -(Math.sin(r0) * (this.shot_recoil));
        }
        update() {
            let r0 = (this.angle * Math.PI) / 180;
            // accelerate if there is movement input
            if(this.controls.forward && !this.controls.reverse) {
                // move forward
                this.acc.x = Math.cos(r0) * this.acc_speed;
                this.acc.y = Math.sin(r0) * this.acc_speed;

            } else if(this.controls.reverse && !this.controls.forward) {
                // move in reverse
                this.acc.x = -(Math.cos(r0) * (this.acc_speed/2));
                this.acc.y = -(Math.sin(r0) * (this.acc_speed/2));
            }
            if(this.controls.left && !this.controls.right) {
                // rotate left
                this.angle -= this.rotate_speed;

            } else if(this.controls.right && !this.controls.left) {
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
            this.checkControls();
            this.updateProjectiles();
            this.draw();
        }
        updateProjectiles() {
            for(let i = 0; i < this.projectiles.length; i++) {
                this.projectiles[i].update();
            }
        }
        checkControls() {
            if(this.controls.shoot) {
                this.controls.shoot = false;
                this.shoot();
            }
        }
        drawScore() {
            score_div.innerHTML = `${this.score}`;
        }
        applyForce(x=0, y=0) {
            this.acc.x += x;
            this.acc.y += y;
        }
        wallCollisions() {
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
        positionScoreDiv();
        leaderboard_div.style.width = `${width}px`;
        animate();
    }

    function joinGame() {
        join_modal.style.display = 'none';
        join_btn.style.disabled = true;
        player = new Player(socket.id, player_name.value, width/2, height/2, player_color.value);
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

    function updateLeaderboard() {
        leaderboard_entries_div.innerHTML = leaderboard.getFormattedEntriesHTML();
    }

    function positionScoreDiv() {
        let boundBox = canvas.getBoundingClientRect();
        score_div.style.top = `${boundBox.top+15}px`;
        score_div.style.left = `${boundBox.left+20}px`;
    }

    function animate() {
        bgFill('black');
        if(player) player.update();
        if(join_success) sendPlayerUpdate();
        updateOpponents();
        updateLeaderboard();
        requestAnimationFrame(animate);
    }
}