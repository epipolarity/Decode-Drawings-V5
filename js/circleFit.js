import { averagePoint, distance } from "./utils.js"

export function checkCircle(points, ctx, iterations = 10000) {

    let p1, p2, p3;
    let centre, radius;
    let bestCentre, bestRadius;
    let bestPoints;
    let bestError = Number.MAX_VALUE;

    const sanityCheck = getMaxBound(points);

    for (let i = 0; i < iterations; i++) {
        [p1, p2, p3] = choose3Points(points);
        ({ centre, radius } = circleFrom3Points(p1, p2, p3));

        if (radius < sanityCheck) {

            const circleError = getCircleError(points, centre, radius);
            if (circleError < bestError) {
                bestError = circleError;
                bestCentre = { x: centre.x, y: centre.y };
                bestRadius = radius;
                bestPoints = [p1, p2, p3].map(p => ({ x: p.x, y: p.y }));
            }

        }

    }

    drawCircle(ctx, bestCentre, bestRadius);
    drawPoints(ctx, bestPoints);

    return bestError;

}


function getCircleError(points, centre, radius) {

    const sumSqrError = points.reduce((sumSqr, point) => sumSqr + Math.pow((distance(point, centre) - radius) / radius, 2), 0);
    const meanSqrError = sumSqrError / points.length;

    return Math.sqrt(meanSqrError);

}


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


function drawCircle(ctx, centre, radius) {

    ctx.save();
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centre.x, centre.y, radius, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();

}

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


function circleFrom3Points(p1, p2, p3) {

    const midP1P2 = averagePoint([p1, p2]);
    const midP2P3 = averagePoint([p2, p3]);

    const angleP1P2 = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    const angleP2P3 = Math.atan2(p3.y - p2.y, p3.x - p2.x);

    const perpAngleP1P2 = angleP1P2 + Math.PI / 2;
    const perpAngleP2P3 = angleP2P3 + Math.PI / 2;

    const perpPointP1P2 = {
        x: midP1P2.x + 10 * Math.cos(perpAngleP1P2),
        y: midP1P2.y + 10 * Math.sin(perpAngleP1P2)
    }

    const perpPointP2P3 = {
        x: midP2P3.x + 10 * Math.cos(perpAngleP2P3),
        y: midP2P3.y + 10 * Math.sin(perpAngleP2P3)
    }

    const mP1P2 = (perpPointP1P2.y - midP1P2.y) / (perpPointP1P2.x - midP1P2.x)
    const cP1P2 = midP1P2.y - mP1P2 * midP1P2.x;

    const mP2P3 = (perpPointP2P3.y - midP2P3.y) / (perpPointP2P3.x - midP2P3.x)
    const cP2P3 = midP2P3.y - mP2P3 * midP2P3.x;

    const intersectionX = (cP2P3 - cP1P2) / (mP1P2 - mP2P3);
    const intersectionY = mP1P2 * intersectionX + cP1P2;

    return {
        centre: {
            x: intersectionX,
            y: intersectionY
        },
        radius: distance({
            x: intersectionX,
            y: intersectionY
        }, p1)
    };

}