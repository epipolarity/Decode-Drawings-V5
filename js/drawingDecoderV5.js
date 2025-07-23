import { pointsArrayToTextLines, map, cartesianToAngular, averagePoint, distance } from "./utils.js";
import { undistortPoint } from "./undistort.js";

const expectedAngles = {
    red: -Math.PI / 2,
    blue: 5 * Math.PI / 6,
    green: Math.PI / 6
};

const triangleHeight = Math.sqrt(Math.pow(9, 2) - Math.pow(9 / 2, 2));
const triangleCenter = averagePoint([{ x: 0, y: 0 }, { x: 9, y: 0 }, { x: 9 / 2, y: triangleHeight }]);

// version 5
export default class DrawingDecoder {

    constructor(
        smooth = 0,
        zThreshold = 0,
        checkZ = false,
        focalLength = { x: 615, y: 615 },
        opticalCentre = { x: 640, y: 360 },
        k1 = 0,
        tiltFactor = { x: 0, y: 0 }
    ) {

        this.collector = [];                // collector stores the decoded XY image coordinates for later export
        this.rejected = [];                 // points that were rejected due to zThreshold

        this.smooth = smooth;               // smoothing factor (0-1)
        this.zThreshold = zThreshold;       // z-threshold for deciding if pen is in contact with paper


        this.checkZ = checkZ;

        this.focalLength = focalLength;
        this.opticalCentre = opticalCentre;
        this.k1 = k1;
        this.tiltFactor = tiltFactor;

    }


    // takes a 2d context to draw onto and a 'balls' object describing the size and position of each ball in the current frame
    decode(ctx, contours) {

        const balls = {};

        for (const ballKey in contours) {
            const contour = contours[ballKey];
            balls[ballKey] = {};
            balls[ballKey].contour = contour.map(point => cartesianToAngular(
                undistortPoint(point, this.opticalCentre, this.k1),
                this.focalLength,
                this.opticalCentre
            ));
            balls[ballKey].centroid = averagePoint(balls[ballKey].contour);
            balls[ballKey].radius = balls[ballKey].contour.reduce((sum, point) => sum + distance(point, balls[ballKey].centroid), 0) / balls[ballKey].contour.length;
        }

        // estimate range to each of the three balls based on size and position
        const redRange = this.#getRange(balls.red);
        const greenRange = this.#getRange(balls.green);
        const blueRange = this.#getRange(balls.blue);

        // trilaterate camera position vertically and horizontally
        const camPositionVertical = this.#trilaterate(7.79, redRange, (blueRange + greenRange) / 2);    // 7.79cm is vertical 'baseline' of 9cm triangle
        const camPositionHorizontal = this.#trilaterate(9, blueRange, greenRange);                      // 9cm is horizontal 'baseline' of 9cm triangle

        // map observed x and y values to canvas pixel range
        let x = map(camPositionHorizontal.x, -12, 4, 150, 550);
        let y = map((camPositionHorizontal.y + camPositionVertical.y) / 2, 17, 33, 150, 550);

        // sign is inverted - i maybe did something backwards
        let z = -camPositionVertical.x;

        const expectedAngleToRed = Math.asin((9 - triangleCenter.y) / redRange);

        y += (-balls.red.centroid.y - expectedAngleToRed) * this.tiltFactor.y;

        // pen is tilted left/right if triangle appears rotated
        const triangleCentroid = averagePoint([balls.red.centroid, balls.green.centroid, balls.blue.centroid]);

        const redAngle = Math.atan2(balls.red.centroid.y - triangleCentroid.y, balls.red.centroid.x - triangleCentroid.x);
        const blueAngle = Math.atan2(balls.blue.centroid.y - triangleCentroid.y, balls.blue.centroid.x - triangleCentroid.x);
        const greenAngle = Math.atan2(balls.green.centroid.y - triangleCentroid.y, balls.green.centroid.x - triangleCentroid.x);

        const meanRotation = ((redAngle - expectedAngles.red) + (blueAngle - expectedAngles.blue) + (greenAngle - expectedAngles.green)) / 3;
        // console.log(meanRotation);

        // if pen is tilted left, then tip is further right than camera
        x += meanRotation * this.tiltFactor.x;

        // udpate drawing if camera (pen) has moved 
        if (this.lastPosition && (x != this.lastPosition.x || y != this.lastPosition.y)) {

            // apply smoothing as weighted average
            x = x * (1 - this.smooth) + this.lastPosition.x * this.smooth;
            y = y * (1 - this.smooth) + this.lastPosition.y * this.smooth;
            z = z * (1 - this.smooth) + this.lastPosition.z * this.smooth;

            // if z exceeds threshold stop drawing - pen is off paper
            if (this.checkZ && z > this.zThreshold) {
                this.lastPosition = null;
                this.rejected.push({ x: Math.round(x), y: Math.round(y), z });
                return;
            }

            // store x and y canvas integer pixel coordinates
            this.collector.push({ x: Math.round(x), y: Math.round(y), z });

            // draw from last position to current position
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(this.lastPosition.x, this.lastPosition.y);
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.restore();

        }

        // update last position
        this.lastPosition = { x, y, z };

    }


    // calculate distance from camera to given ball in cm using centroid and radius
    #getRange(ball) {
        return 3 / (Math.sin(ball.radius));
    }


    // given lengths of three sides of a triangle, calculate the position of point where b meets c (camera position)
    // assuming side a defines the x axis and the origin is where a meets c
    // there is probably a mathematical identity for this, but i worked it out from pythagoras
    // b and c are the distances from the camera to different balls based on result of this.#getRange()
    // a is the distance between the balls which is known
    #trilaterate(a, b, c) {
        const x = (Math.pow(b, 2) - Math.pow(a, 2) - Math.pow(c, 2)) / (2 * a);
        const y = Math.sqrt(Math.pow(c, 2) - Math.pow(x, 2));
        return { x, y };
    }


    // return the string representation of the collector
    // a string of space-separated XY pairs on each line
    toString() {
        return pointsArrayToTextLines(this.collector);
    }

}