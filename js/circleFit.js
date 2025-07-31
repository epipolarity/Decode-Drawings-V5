import { averagePoint, distance } from "./utils.js"

// function to determine how circular a set of 2d points is
// and draw the result on a 2d context if provided
// loosely based on a misrembered ransac algorithm
export function checkCircle(points, ctx, iterations = 10000) {

    let p1, p2, p3;
    let centre, radius;
    let bestCentre, bestRadius;
    let bestPoints;
    let bestError = Number.MAX_VALUE;

    const sanityCheck = getMaxBound(points);                                    // get the extent of all points to check radius is less than this, otherwise a very large
                                                                                // circle could have a good fit if all the points are relatively close to a tiny bit of it
    for (let i = 0; i < iterations; i++) {
        [p1, p2, p3] = choose3Points(points);                                   // get three random points from which to calculate a candidate circle
        ({ centre, radius } = circleFrom3Points(p1, p2, p3));                   // get the centre and radius of that circle

        if (radius < sanityCheck) {                                             // check it isn't silly

            const circleError = getCircleError(points, centre, radius);         // find out how well all the points fit this candidate circle
            if (circleError < bestError) {                                      // keep track of which circle was the best
                bestError = circleError;
                bestCentre = { x: centre.x, y: centre.y };
                bestRadius = radius;
                bestPoints = [p1, p2, p3].map(p => ({ x: p.x, y: p.y }));
            }

        }

    }

    if (ctx) {                                                                  // if a 2d context was provided
        drawCircle(ctx, bestCentre, bestRadius);                                // draw the best circle on it
        drawPoints(ctx, bestPoints);                                            // and the three points that defined it
    }

    return bestError;                                                           // return the error between the given data points and the best circle

}


// return RMS error between the given circle radius and each point's distance from the circle's centre
function getCircleError(points, centre, radius) {

    const sumSqrError = points.reduce((sumSqr, point) => sumSqr + Math.pow((distance(point, centre) - radius) / radius, 2), 0);
    const meanSqrError = sumSqrError / points.length;

    return Math.sqrt(meanSqrError);

}


// get the maximum of the width or height of the bounding box containing all points
function getMaxBound(points) {

    let maxX = -Number.MAX_VALUE;
    let maxY = -Number.MAX_VALUE;
    let minX = Number.MAX_VALUE;
    let minY = Number.MAX_VALUE;

    for (const point of points) {
        if (point.x > maxX) maxX = point.x;
        if (point.y > maxY) maxY = point.y;
        if (point.x < minX) minX = point.x;
        if (point.y < minY) minY = point.y;
    }

    return Math.max(maxX - minX, maxY - minY);

}


// choose three unique points at random from an array of points and return as an array of three points
function choose3Points(points) {

    const idx1 = Math.floor(Math.random() * points.length);
    let idx2 = idx1;
    let idx3 = idx1;

    while (idx1 === idx2 || idx2 === idx3 || idx3 === idx1) {
        idx2 = Math.floor(Math.random() * points.length);
        idx3 = Math.floor(Math.random() * points.length);
    }

    return [points[idx1], points[idx2], points[idx3]];

}


// calculate the circle that uniquely passes through the three given points
// based on https://en.wikipedia.org/wiki/Circumcircle#Straightedge_and_compass_construction
// and using the facts that:
// 1. the three points form a triangle
// 2. each edge of the triangle is the chord of the circle
// 3. the line perpendicular to a chord which passes through the midpoint of that chord (perpendicular bisector) must also pass through the circle centre
// 4. where two of these perpendicular lines intersect must be the circle centre
// 5. the distance from the centre to any and each point is the radius
function circleFrom3Points(p1, p2, p3) {

    const midP1P2 = averagePoint([p1, p2]);                                             // get the midpoint of two of the 'triangle edges'
    const midP2P3 = averagePoint([p2, p3]);                                             // p1p2 and p2p3

    const angleP1P2 = Math.atan2(p2.y - p1.y, p2.x - p1.x);                             // get the angle of these two triangle edges
    const angleP2P3 = Math.atan2(p3.y - p2.y, p3.x - p2.x);

    const perpAngleP1P2 = angleP1P2 + Math.PI / 2;                                      // get the perpendicular angle by adding PI/2
    const perpAngleP2P3 = angleP2P3 + Math.PI / 2;

    const perpPointP1P2 = {                                                             // get a second point, 10 units in the direction of the
        x: midP1P2.x + 10 * Math.cos(perpAngleP1P2),                                    // perpendicular angle from the triangle edge midpoint
        y: midP1P2.y + 10 * Math.sin(perpAngleP1P2)                                     // which now defines the perpendicular bisector
    }

    const perpPointP2P3 = {                                                             // for each of the two 'triangle edges'
        x: midP2P3.x + 10 * Math.cos(perpAngleP2P3),
        y: midP2P3.y + 10 * Math.sin(perpAngleP2P3)
    }

    const mP1P2 = (perpPointP1P2.y - midP1P2.y) / (perpPointP1P2.x - midP1P2.x);        // calculate the gradient and intercept for each 
    const cP1P2 = midP1P2.y - mP1P2 * midP1P2.x;                                        // perpendicular bisector

    const mP2P3 = (perpPointP2P3.y - midP2P3.y) / (perpPointP2P3.x - midP2P3.x)
    const cP2P3 = midP2P3.y - mP2P3 * midP2P3.x;

    const intersectionX = (cP2P3 - cP1P2) / (mP1P2 - mP2P3);                            // find the point where the two perpendicular bisectors intersect
    const intersectionY = mP1P2 * intersectionX + cP1P2;                                // this is the circle centre

    return {
        centre: {
            x: intersectionX,                                                           // return intersection point as centre
            y: intersectionY
        },
        radius: distance({
            x: intersectionX,                                                           // and distance from centre to p1 as radius
            y: intersectionY
        }, p1)
    };

}


// draw given circle in thick red on given context
function drawCircle(ctx, centre, radius) {

    ctx.save();
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centre.x, centre.y, radius, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();

}


// draw given set of points as large green dots on given context
function drawPoints(ctx, points) {

    ctx.save();
    ctx.fillStyle = "green";
    for (const point of points) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
        ctx.fill();
    }
    ctx.restore();
}