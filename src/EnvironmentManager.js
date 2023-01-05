const STAR_COUNT = 100,
    SATELLITE_MIN = 0,
    SATELLITE_MAX = 3;

class EnvironmentManager {
    constructor(canvas, context) {
        this.canvas = canvas;
        this.ctx = context;

        // Stars
        this.stars = [];
        this.generateStars();
    }
    generateStars() {
        for(let i = 0; i < STAR_COUNT; i++) {
            let x = Utilities.rand(0, this.canvas.width);
            let y = Utilities.rand(0, this.canvas.height);
            this.stars.push(new Star(x, y));
        }
    }
    updateStars() {
        for(let i = 0; i < this.stars.length; i++) {
            this.stars[i].update(this.ctx);
        }
    }
    update() {
        this.updateStars();
    }
}

class Star {
    constructor(x, y) {
        this.pos = {x: x, y: y};
        this.rgb = {
            r: Utilities.rand(220, 255),
            g: Utilities.rand(220, 255),
            b: Utilities.rand(210, 255),
        };
        this.max_alpha = Utilities.rand(1.5, 2);
        this.alpha_rate = Utilities.rand(0.005, 0.02);
        this.alpha = Utilities.rand(0, this.alpha_rate);
        this.hasSatellites = (Utilities.rand(-1, 1, false) > 0 ? true : false);
        if(this.hasSatellites) this.satellites = new Array(Utilities.rand(SATELLITE_MIN, SATELLITE_MAX, true));
        else this.satellites = [];
        this.initialize();
    }
    initialize() {
        for(let i = 0; i < this.satellites.length; i++) {
            this.satellites[i] = new StarSatellite(this, i+1);
        }
    }
    draw(ctx) {
        let a = (Math.cos(this.alpha)) + this.max_alpha;
        ctx.fillStyle = `rgba(${this.rgb.r}, ${this.rgb.g}, ${this.rgb.b}, ${a})`;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, a, 0, 2*Math.PI, false);
        ctx.fill();
    }
    drawSatellites(ctx) {
        for(let i = 0; i < this.satellites.length; i++) {
            this.satellites[i].update(ctx);
        }
    }
    update(ctx) {
        this.alpha += this.alpha_rate;
        this.draw(ctx);
        if(this.hasSatellites) this.drawSatellites(ctx);
    }
}

class StarSatellite {
    constructor(parent, dist_multiplier) {
        this.parent = parent;
        this.pos = {x: this.parent.pos.x, y: this.parent.pos.y};
        this.dist = 5 * dist_multiplier;
        this.vel = {x: Utilities.rand(-0.05, 0.05), y: Utilities.rand(-0.05, 0.05)};
        this.rgb = {
            r: Utilities.rand(100, 255),
            g: Utilities.rand(100, 255),
            b: Utilities.rand(100, 255),
        };
    }
    draw(ctx) {
        ctx.fillStyle = `rgb(${this.rgb.r}, ${this.rgb.g}, ${this.rgb.b})`;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, 1, 0, 2*Math.PI, false);
        ctx.fill();
    }
    update(ctx) {
        this.pos.x += this.vel.x;
        this.pos.y += this.vel.y;
        let pd = Math.sqrt(Math.pow((this.parent.pos.x - this.pos.x), 2) + Math.pow((this.parent.pos.y - this.pos.y), 2));
        if(pd >= this.dist) {
            this.vel.x *= -1;
            this.vel.y *= -1;
        }
        this.draw(ctx);
    }
}