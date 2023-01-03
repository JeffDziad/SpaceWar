class Utilities {
    static midpoint(x1, x2, y1, y2) {
        return {
            x: (x1 + x2) / 2,
            y: (y1 + y2) / 2
        }
    }
    static lineSegmentsIntercept(p0, p1, p2, p3) {
        let v1, v2, v3, cross, u1, u2;
        v1.x = p1.x - p0.x;
        v1.y = p1.y - p0.y;
        v2.x = p3.x - p2.x;
        v2.y = p3.y - p2.y;
        if((cross = v1.x * v2.y - v1.y * v2.x) === 0) {
            return false;
        }
        v3 = {
            x: p0.x - p2.x,
            y: p0.y - p2.y,
        };
        u2 = (v1.x * v3.y - v1.y * v3.x) / cross;
        if(u2 >= 0 && u2 <= 1) {
            u1 = (v2.x * v3.y - v2.y * v3.x) / cross;
            return (u1 >= 0 && u1 <= 1);
        }
        return false;
    }
    static fixed(x) {
        return Number.parseFloat(x).toFixed(0);
    }
    static area(p1, p2, p3) {
        let p1x = this.fixed(p1.x);
        let p1y = this.fixed(p1.y);
        let p2x = this.fixed(p2.x);
        let p2y = this.fixed(p2.y);
        let p3x = this.fixed(p3.x);
        let p3y = this.fixed(p3.y);

        return Math.abs((p1x*(p2y-p3y) + p2x*(p3y-p1y) + p3x*(p1y-p2y))/2.0);
    }
    static isInside(p, p1, p2, p3) {
        let A = this.area(p1, p2, p3);
        let A1 = this.area(p, p2, p3);
        let A2 = this.area(p1, p, p3);
        let A3 = this.area(p1, p2, p);
        return (A === A1 + A2 + A3);
    }
    static rand(min, max, floor=false) {
        if(floor) return Math.floor(Math.random() * (max-min) + min);
        else return Math.random() * (max-min) + min;
    }
}