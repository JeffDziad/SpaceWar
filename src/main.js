window.onload = () => {

    // Game Constants
    const socket = io(),
        canvas = document.getElementById('space-war'),
        ctx = canvas.getContext('2d'),
        joinBtn = document.getElementById('join-btn');
        joinBtn.addEventListener('click', joinGame);

    // HTML Constants
    const game_loading = document.getElementById('game-loading'),
        game_centered = document.getElementById('game-centered');
        
    let width, 
        height, 
        player, 
        thrust_particles = [];
        opponents = [];

    socket.on('game_init', (data) => {
        thrust_particles = [];
        let d = data.game_vars;
        width = canvas.width = d.width;
        height = canvas.height = d.height;
        init();
    });

    class Particle {
        // All particles are arcs
        // originX, originY - where the particle is emitted
        // iVelObj, iAccObj ({x, y}) - the initial values of velocity and acceleration
        // isPersistent, lifetimeMS - is the particle lifetime infinite or is it finite with a given lifetime in milliseconds. 
        // lifetimeFunc, lifetimeFuncDelayMS - is there a function that runs and modifys the particles features throughout its lifetime and if so, how often does it run.
        constructor(id, originX, originY, colorRGB, radius, iVelObj, iAccObj, fade, fadeDelay) {
            this.created = performance.now();
            this.recent = this.created;
            this.color = colorRGB;
            this.radius = radius;
            this.fade = fade;
            this.fade_delay = fadeDelay;
            this.color_alpha = 1;
            this.pos = {
                x: originX,
                y: originY
            };
            this.vel = {
                x: iVelObj.x,
                y: iVelObj.y
            };
            this.acc = {
                x: iAccObj.x,
                y: iAccObj.y
            };
        }
        draw() {
            console.log('draw')
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, this.radius, 0, 2*Math.PI);
            ctx.fill();
        }
        checkBounds() {
            //! DANGER
            
        }
        update() {
            //// apply acceleration to velocity
            // this.vel.x += this.acc.x;
            // this.vel.y += this.acc.y;

            // // apply drag to velocity - slows player after no input
            // this.vel.x *= this.drag;
            // this.vel.y *= this.drag;

            // // update position
            this.pos.x += this.vel.x;
            this.pos.y += this.vel.y;

            // // reset acceleration
            // this.acc.x = 0;
            // this.acc.y = 0;
            this.draw();
            this.checkBounds();
        }
    }

    class Opponent {
        constructor() {
            
        }
    }

    class Player {
        constructor(iX, iY, body_color) {
            this.created = performance.now();
            this.recent = this.created;
            // equilateral triangle
            this.radius = 25;
            this.angle = 0;

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
                // thrust particles
                this.draw_thrust();

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
        // 1. Make canvas visible, hide loading spinner
        game_loading.style.display = 'none';
        game_centered.style.display = 'inline-block';
        animate();
    }

    function joinGame() {
        // 1. Prompt for player name, choose color
        // -- once submitted check if name is already in use, if so ask for new name
        // -- upon successful submit, hide join button and display leaderboard
        // 2. add player

        // default test player
        player = new Player(width/2, height/2, "blue");
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

    function animate() {
        bgFill('black');
        if(player) player.update();
        requestAnimationFrame(animate);
    }

}




