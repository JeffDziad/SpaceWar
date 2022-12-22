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

    class Ammo {
        constructor() {
            //? this.inner.value must be divisable by this.shot_limit
            this.max_value = 200;
            this.inner = {
                x: 10,
                y: height-30,
                height: 20,
                value: this.max_value,
                margin: 2,
            }

            this.outer = {
                x: this.inner.x - this.inner.margin,
                y: this.inner.y - this.inner.margin,
                width: this.inner.value + (this.inner.margin*2),
                height: this.inner.height + (this.inner.margin*2),
            }

            this.shot_limit = 4;
            this.shot_reload_MS = 50;
            this.cell_size = this.inner.value/this.shot_limit;
            this.last_increase = performance.now();
        }
        shot() {
            // called when shot has been made
            if(this.inner.value >= this.cell_size) {
                this.inner.value -= this.cell_size;
            }
        }
        canShoot() {
            return this.inner.value >= this.cell_size;
        }
        draw() {
            if(this.inner.value < this.max_value) {
                if(performance.now() - this.last_increase > this.shot_reload_MS) {
                    this.inner.value++;
                    this.last_increase = performance.now();
                }
            }
            // Draw ammo box
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fillRect(this.outer.x, this.outer.y, this.outer.width, this.outer.height);

            // Draw ammo bar
            ctx.fillStyle = 'rgba(0, 0, 255, 0.5)';
            ctx.fillRect(this.inner.x, this.inner.y, this.inner.value, this.inner.height);

            // Draw Ammo Bars
            ctx.strokeStyle = "white";
            ctx.strokeWeight = 2;
            for(let i = 1; i < this.shot_limit; i++) {
                ctx.beginPath();
                ctx.moveTo(this.inner.x + (this.cell_size*i), this.outer.y);
                ctx.lineTo(this.inner.x + (this.cell_size*i), this.outer.y + this.outer.height);
                ctx.stroke();
            }
        }
    }

    class ThrustTrail {
        constructor(p0, p1, p2, angle) {
            // {x, y}
            this.angle = angle;
            this.p0 = p0;
            this.p1 = p1;
            this.p2 = p2;
            this.speed = 2;

            this.vel = {
                x: 0, 
                y: 0,
            }

            this.createdMS = performance.now();
            this.destroyMS = 60;
            this.canDestroy = false;
            this.alpha_decayMS = 1;
        }
        draw() {
            //let alpha = ((performance.now() - this.createdMS)-0)/(100 - 0);
            let alpha = Math.sin((performance.now() - this.createdMS));
            alpha = 1 - alpha;
            ctx.strokeStyle = `rgba(30, 144, 255, ${alpha})`;
            ctx.moveTo(this.p0.x, this.p0.y);
            ctx.lineTo(this.p2.x, this.p2.y);
            ctx.lineTo(this.p1.x, this.p1.y);
            ctx.stroke();
        }
        update() {
            if(performance.now() - this.createdMS > this.destroyMS) {
                this.canDestroy = true;
            } else {
                let r0 = (this.angle * Math.PI) / 180;
                this.vel.x += -(Math.cos(r0) * this.speed)
                this.vel.y += -(Math.sin(r0) * this.speed);

                this.p0.x += this.vel.x;
                this.p0.y += this.vel.y;
    
                this.p1.x += this.vel.x;
                this.p1.y += this.vel.y;
    
                this.p2.x += this.vel.x;
                this.p2.y += this.vel.y;

                this.draw();
            }
            
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
            ctx.strokeWeight = 10;
            ctx.strokeStyle = "black";
            ctx.beginPath();
            ctx.moveTo(this.od.pos.x, this.od.pos.y);
            ctx.lineTo(this.od.points.p1.x, this.od.points.p1.y);
            ctx.stroke();

            //Update Leaderboard Score
            leaderboard.updateEntry(this.socketID, this.od.score);
        }
        drawProjectiles() {
            //! Not Effecient - creating new projectile every update
            for(let i = 0; i < this.od.projectiles.length; i++) {
                let p = new Projectile(this.socketID, this.od.projectiles[i].color,
                    this.od.projectiles[i].pos.x, this.od.projectiles[i].pos.y, this.od.vel.x, this.od.vel.y, this.od.angle);
                p.draw();
            }
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
                engineValue: 0,
                engineSpeed: 0.1,
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
                forward: false,
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
            this.shot_recoil = 1.5;
            this.rotate_speed = 3;
            this.acc_speed = 0.1;
            this.drag = 0.99;
            this.wall_force = 1;
            this.initEvents();
            this.ammo = new Ammo();

            // weapons 
            this.projectiles = [];

            // cosmetic
            this.thrust_trails = [];

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

            //draw windsheild
            let t0 = Utilities.midpoint(this.points.p1.x, this.points.p2.x, this.points.p1.y, this.points.p2.y);
            let t1 = Utilities.midpoint(this.points.p1.x, this.points.p3.x, this.points.p1.y, this.points.p3.y);
            ctx.fillStyle = 'black';
            ctx.strokeStyle = 'white';
            ctx.beginPath();
            ctx.moveTo(this.points.p1.x, this.points.p1.y);
            ctx.lineTo(t0.x, t0.y);
            ctx.lineTo(t1.x, t1.y);
            ctx.lineTo(this.points.p1.x, this.points.p1.y)
            ctx.fill();
            ctx.stroke();

            // draw engine
            ctx.strokeStyle="black";
            ctx.strokeWeight = 5;
            if(this.controls.forward || this.controls.reverse) {
                let g = (Math.cos(this.colors.engineValue) * 100) + 144;
                //let b = Math.sin(this.colors.engineValue) * 170;
                this.colors.engineValue += (this.colors.engineSpeed*(this.vel.x + this.vel.y));
                ctx.fillStyle = `rgba(30, ${g}, 255, 1)`;
                this.thrust_trails.push(new ThrustTrail(this.points.p2, this.points.p3, {x: this.pos.x, y: this.pos.y}, this.angle));
            } else {
                ctx.fillStyle = `rgba(30, 144, 255, 1)`;
            }
            ctx.beginPath();
            ctx.moveTo(this.pos.x, this.pos.y);
            ctx.lineTo(this.points.p2.x, this.points.p2.y);
            ctx.lineTo(this.points.p3.x, this.points.p3.y);
            ctx.lineTo(this.pos.x, this.pos.y);
            ctx.fill();
            ctx.stroke();

            //Update Leaderboard Score
            leaderboard.updateEntry(this.socketID, this.score);
            //Update score in score-div
            this.drawScore();

        }
        shoot() {
            if(this.ammo.canShoot()) {
                this.projectiles.push(new Projectile(this.socketID, this.colors.body, this.points.p1.x, this.points.p1.y, this.vel.x, this.vel.y, this.angle));
                let r0 = (this.angle * Math.PI) / 180;
                this.vel.x += -(Math.cos(r0) * (this.shot_recoil));
                this.vel.y += -(Math.sin(r0) * (this.shot_recoil));
                this.ammo.shot();
            }
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

            this.checkControls();

            this.opponentCollisions();
            this.wallCollisions();

            this.updateProjectiles();
            this.projectileCollisions();
            
            

            this.draw();

            this.updateThrustTrail();
        }
        opponentCollisions() {
            // Line segment intersection needed
        }
        projectileCollisions() {
            // Loop through this.projectiles and opponent projectiles.
            for(let i = 0; i < this.projectiles.length; i++) {
                let p = this.projectiles[i];
                let intersect = Utilities.isInside(p.pos, this.points.p1, this.points.p2, this.points.p3);
                if(intersect) {
                    this.killedBy(p);
                }
            } 
            for(let i = 0; i < opponents.length; i++) {
                let o = opponents[i];
                for(let j = 0; j < o.od.projectiles.length; j++) {
                    let p = o.od.projectiles[j];
                    let intersect = Utilities.isInside(p.pos, this.points.p1, this.points.p2, this.points.p3);
                    if(intersect) {
                        this.killedBy(p);
                    }
                }
            } 
        }
        killedBy(projectile) {
            // 1. stop drawing player
            // 2. add point to opponent (no points for hitting own projectiles)
            // 3. start counter on screen from 3 - 1. Respawn player randomly on screen.
            console.log(projectile.owner);
        }
        updateProjectiles() {
            //! Not Effecient - removing projectiles after update loop. TOO MANY LOOPS
            //? Check JS Fiddle for solution
            let remove = [];
            for(let i = 0; i < this.projectiles.length; i++) {
                if(this.projectiles[i].pos.x > width + this.projectiles[i].radius || 
                    this.projectiles[i].pos.x < 0 - this.projectiles[i].radius || 
                    this.projectiles[i].pos.y > height + this.projectiles[i].radius || 
                    this.projectiles[i].pos.y < 0 - this.projectiles[i].radius) {
                        // outside bounds
                        remove.push(i);
                } else {
                    this.projectiles[i].update();
                }
            }
            for(let i = 0; i < remove.length; i++) {
                this.projectiles.splice(remove[i], 1);
            }
        }
        checkControls() {
            if(this.controls.shoot) {
                this.controls.shoot = false;
                this.shoot();
            }
        }
        updateThrustTrail() {
            let destroyPool = [];
            for(let i = 0; i < this.thrust_trails.length; i++) {
                if(this.thrust_trails[i].canDestroy) {
                    destroyPool.push(i);
                }
                this.thrust_trails[i].update();
            }
            for(let i = 0; i < destroyPool.length; i++) {
                this.thrust_trails.splice(destroyPool[i], 1);
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
        if(join_success) sendPlayerUpdate();
        updateOpponents();
        if(player)  {
            player.update();
            player.ammo.draw();
        }
        updateLeaderboard();
        requestAnimationFrame(animate);
    }
}