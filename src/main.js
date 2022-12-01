window.onload = () => {

    const socket = io(),
        canvas = document.getElementById('tron'),
        ctx = canvas.getContext('2d'),
        joinBtn = document.getElementById('join-btn');
        joinBtn.addEventListener('click', joinGame);
        
    let width, 
        height, 
        cell_size,
        cols, rows, 
        player, 
        opponents = [];

    socket.on('game_init', (data) => {
        let d = data.game_vars;
        width = canvas.width = d.width;
        height = canvas.height = d.height;
        cell_size = d.cell_size;
        cols = Math.floor(width/cell_size);
        rows = Math.floor(height/cell_size);
        console.log(cols, rows);
        init();
    });

    class Opponent {
        constructor() {
            
        }
    }

    class Player {
        constructor(iX, iY) {
            this.x = iX;
            this.y = iY;
            this.color = `rgb(${rand(0, 255)}, ${rand(0, 255)}, ${rand(0, 255)})`;
        }
        draw() {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, cell_size, cell_size);
        }
        update() {
            this.draw();
        }
        move(event)
    }

    function init() {
        animate();
    }

    function joinGame() {
        player = new Player(rand((cols*0.25), cols-(cols*0.25))*cell_size, rand((rows*0.25), rows-(rows*0.25))*cell_size);
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
        bgFill('white');
        strokeBounds('black')
        if(player) player.update();
        requestAnimationFrame(animate);
    }

}




