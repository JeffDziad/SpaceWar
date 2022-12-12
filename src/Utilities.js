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
    static area(x1, y1, x2, y2, x3, y3) {
        return Math.abs((x1*(y2-y3) + x2*(y3-y1)+ x3*(y1-y2))/2.0);
    }
    static isInside(x1, y1, x2, y2, x3, y3, x, y) {
        /* Calculate area of triangle ABC */
        let A = this.area (x1, y1, x2, y2, x3, y3);
        /* Calculate area of triangle PBC */
        let A1 = this.area (x, y, x2, y2, x3, y3);
        /* Calculate area of triangle PAC */
        let A2 = this.area (x1, y1, x, y, x3, y3);
        /* Calculate area of triangle PAB */   
        let A3 = this.area (x1, y1, x2, y2, x, y);
        /* Check if sum of A1, A2 and A3 is same as A */
        return (A == A1 + A2 + A3);
    }
}