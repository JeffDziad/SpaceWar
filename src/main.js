window.onload = () => {

    const socket = io(),
        canvas = document.getElementById('space-war'),
        ctx = canvas.getContext('2d'),
        joinBtn = document.getElementById('join-btn');
        joinBtn.addEventListener('click', joinGame);
        
    let width, 
        height, 
        player, 
        opponents = [];

    socket.on('game_init', (data) => {
        let d = data.game_vars;
        width = canvas.width = d.width;
        height = canvas.height = d.height;
        init();
    });

    class Opponent {
        constructor() {
            
        }
    }

    class Player {
        constructor(iX, iY, body_color) {
            // equilateral triangle
            this.radius = 25;
            this.angle = 0;

            // general variables
            this.colors = {
                body: body_color,
            };
            this.pos = {
                x: iX,
                y: iY
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
            }
            this.acc = {
                x: 0,
                y: 0 
            }
            this.rotate_speed = 3;
            this.acc_speed = 0.1;
            this.drag = 0.99;
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
            let p1 = {
                x: this.pos.x + Math.cos(r1) * this.radius,
                y: this.pos.y + Math.sin(r1) * this.radius
            };
            let r2 = ((this.angle + 120) * Math.PI) / 180;
            let p2 = {
                x: this.pos.x + Math.cos(r2) * this.radius,
                y: this.pos.y + Math.sin(r2) * this.radius
            };
            let r3 = ((this.angle + 240) * Math.PI) / 180;
            let p3 = {
                x: this.pos.x + Math.cos(r3) * this.radius,
                y: this.pos.y + Math.sin(r3) * this.radius
            };
            // draw point positions
            ctx.fillStyle = this.colors.body;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.lineTo(p3.x, p3.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.fill();
        }
        update() {
            // handle wall collisions
            // if there is a wall collision:
            // 1. get angle of player relative to the wall they're approaching 
            // 2. remove all velocity
            // 3. apply negative velocity to bounch player off wall

            let r0 = (this.angle * Math.PI) / 180;
            // accelerate if there is movement input
            if(this.forward && !this.reverse) {
                // move forward
                this.acc.x = Math.cos(r0) * this.acc_speed;
                this.acc.y = Math.sin(r0) * this.acc_speed;

            } else if(this.reverse && !this.forward) {
                // move in reverse
                this.acc.x = -(Math.cos(r0) * this.acc_speed);
                this.acc.y = -(Math.sin(r0) * this.acc_speed);
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
            
            this.draw();
        }
    }

    function init() {
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

    function rand(min, max) {
        return Math.floor(Math.random() * (max-min) + min);
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




