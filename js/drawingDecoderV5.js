import { pointsArrayToTextLines, map, cartesianToAngular, averagePoint, distance } from "./utils.js";
import { undistortPoint } from "./undistort.js";

// used for detecting rotation around the camera optical axis, to indicate pen tilting to either side.
// assuming the balls form an equilateral triangle, these are the angles at which we would expect to 
// see each ball relative to the centroid of all three balls
// this is so naive and doesn't consider foreshortening or perspective!
const expectedAngles = {
    red: -Math.PI / 2,
    blue: 5 * Math.PI / 6,
    green: Math.PI / 6
};

// the height of an equilateral triangle with side length 9 (cm)
const triangleHeight = Math.sqrt(Math.pow(9, 2) - Math.pow(9 / 2, 2));

// where the centroid of the balls is in the coordinate system where the blue ball is the origin
const triangleCenter = averagePoint([{ x: 0, y: 0 }, { x: 9, y: 0 }, { x: 9 / 2, y: triangleHeight }]);

// version 5
export default class DrawingDecoder {

    constructor({
        smooth = 0,                                                 // how much weight to apply to temporal smoothing
        zThreshold = 0,                                             // how high pen must appear to raise in Z to be considered 'off the canvas'
        checkZ = false,                                             // whether to check Z or not
        focalLength = { x: 615, y: 615 },                           // focal length in pixels for x and y axes
        opticalCentre = { x: 640, y: 360 },                         // the location on the image sensor where a light ray lands after passing through the lens without refraction
        k1 = 0,                                                     // radial distortion correction coefficient
        tiltFactor = { x: 0, y: 0 },                                // correction factors to apply when the pen is detected to deviate from vertical
        ballRadius = 3                                              // tuning this parameter gave a performance boost. even though we know the value to be 3 in reality - 3.19 gave best results
    } = {}) {

        this.collector = [];                                        // collector stores the decoded XY image coordinates for later export
        this.rejected = [];                                         // points that were rejected due to zThreshold
        this.lastBallsDetected = {};                                // to remember where the balls were on the last frame, for temporal smoothing

        this.smooth = smooth;
        this.zThreshold = zThreshold;
        this.checkZ = checkZ;
        this.focalLength = focalLength;
        this.opticalCentre = opticalCentre;
        this.k1 = k1;
        this.tiltFactor = tiltFactor;
        this.ballRadius = ballRadius;

    }


    // takes a 'contours' object describing the outline of each ball in the current frame, and an optional 2d context to draw the decoded image onto
    decode(contours, ctx) {

        // convert ball outline/contours to centroids and radii
        const balls = this.#getBallsFromContours(contours);

        // estimate range to each of the three balls based on size and position
        const redRange = this.#getRange(balls.red);
        const greenRange = this.#getRange(balls.green);
        const blueRange = this.#getRange(balls.blue);

        // trilaterate camera position vertically and horizontally
        // this.#trilaterate takes the distance between two points (balls), and the range to each of them
        const camPositionVertical = this.#trilaterate(triangleHeight, redRange, (blueRange + greenRange) / 2);  
        const camPositionHorizontal = this.#trilaterate(9, blueRange, greenRange);                                  // <-- 9 (cm) is horizontal 'baseline' of 9cm triangle

        // map observed x and y values to canvas pixel range
        let x = map(camPositionHorizontal.x, -12, 4, 250, 450);
        let y = map(camPositionHorizontal.y, 17, 33, 250, 450);

        // in the vertical trilateration, the x axis corresponds to vertical. The sign appears to be inverted, so I may have got the ordering of something backwards somewhere
        let z = -camPositionVertical.x;

        // calculate what angle we expect to look up at to see the red ball at the calculated range
        const expectedAngleToRed = Math.asin((9 - triangleCenter.y) / redRange);

        // because ball positions are all in radians now, we can easily calculate the difference to work out (roughly) if the pen is tilted forwards or backwards
        y += (-balls.red.centroid.y - expectedAngleToRed) * this.tiltFactor.y;

        // to work out if the pen is rotated left or right, see if the triangle of balls appears to be rotated clockwise or widdershins

        // first get the centroid of the three balls
        const triangleCentroid = averagePoint([balls.red.centroid, balls.green.centroid, balls.blue.centroid]);

        // then the angle from the centroid to each ball
        const redAngle = Math.atan2(balls.red.centroid.y - triangleCentroid.y, balls.red.centroid.x - triangleCentroid.x);
        const blueAngle = Math.atan2(balls.blue.centroid.y - triangleCentroid.y, balls.blue.centroid.x - triangleCentroid.x);
        const greenAngle = Math.atan2(balls.green.centroid.y - triangleCentroid.y, balls.green.centroid.x - triangleCentroid.x);

        // then compare against the expected angles and take an average of the deviation
        const meanRotation = ((redAngle - expectedAngles.red) + (blueAngle - expectedAngles.blue) + (greenAngle - expectedAngles.green)) / 3;

        // if pen is tilted left, the tip is further right than the camera position
        x += meanRotation * this.tiltFactor.x;

        // update results if camera (pen) has moved 
        if (this.lastPosition && (x != this.lastPosition.x || y != this.lastPosition.y)) {

            // if z exceeds threshold - or if z changed too fast relative to overall xyz distance moved
            // stop drawing - but store the position in the 'rejected' list for visualisation
            if (this.checkZ && (z > this.zThreshold || Math.abs((z - this.lastPosition.z) / distance({ x, y, z }, this.lastPosition)) > 0.4)) {
                this.lastPosition = null;
                this.rejected.push({ x: Math.round(x), y: Math.round(y), z });
                return;
            }

            // store x and y canvas integer pixel coordinates - maybe some decimal places could improve score, but they are so messy, and i doubt it.
            this.collector.push({ x: Math.round(x), y: Math.round(y), z });

            if (ctx) {

                // draw from last position to current position
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(this.lastPosition.x, this.lastPosition.y);
                ctx.lineTo(x, y);
                ctx.stroke();
                ctx.restore();

            }

        }

        // update last position
        this.lastPosition = { x, y, z };

    }

    // takes a set of ball outline 'contours' which correspond to raw pixel coordinates in the video data
    // apply radial distortion correction and convert to fisheye model using (mathematically questionable) angular coordinates
    // then calculate and return a radius and centroid for each ball
    #getBallsFromContours(contours) {

        // create object to store radius and centroid for each ball
        const balls = {};

        // repeat the following for each of the three coloured balls
        for (const ballColour in contours) {

            const contour = contours[ballColour];

            // initialise the current coloured ball as empty object
            balls[ballColour] = {};

            // for each point in this ball's contour/outline:
            // 1. remove radial distortion to conform to ideal pinhole model
            // 2. convert from cartesian (wrt image sensor) (rectilinear) to angular (wrt optical axis) (fisheye) model to eliminate elongation towards image edges
            // if my non-rigourous and untested reasoning is correct, this should make balls circular and not elliptical
            // all points are now in radians and no longer in pixels
            balls[ballColour].contour = contour.map(point => cartesianToAngular(
                undistortPoint(point, this.opticalCentre, this.k1), this.focalLength, this.opticalCentre)
            );

            // take the average of all points around the circle edge to find its centre, and take the mean distance of each point from the centre to get its radius
            const centroid = averagePoint(balls[ballColour].contour);
            const radius = balls[ballColour].contour.reduce((sum, point) => sum + distance(point, centroid), 0) / balls[ballColour].contour.length;

            // if we have seen this ball in a previous frame already
            if (this.lastBallsDetected[ballColour]) {

                const { centroid: lastCentroid, radius: lastRadius } = this.lastBallsDetected[ballColour];

                // apply smoothing as weighted average
                balls[ballColour].radius = radius * (1 - this.smooth) + lastRadius * this.smooth;
                balls[ballColour].centroid = {
                    x: centroid.x * (1 - this.smooth) + lastCentroid.x * this.smooth,
                    y: centroid.y * (1 - this.smooth) + lastCentroid.y * this.smooth
                };

            } else {

                // otherwise just use the calculated centroid and radius
                balls[ballColour].centroid = { x: centroid.x, y: centroid.y };
                balls[ballColour].radius = radius;

                // initialise an empty object to store this ball's size and location for next time
                this.lastBallsDetected[ballColour] = {};
            }

            // update the last seen size and location for each ball
            this.lastBallsDetected[ballColour].centroid = { x: balls[ballColour].centroid.x, y: balls[ballColour].centroid.y };
            this.lastBallsDetected[ballColour].radius = balls[ballColour].radius;

        }

        return balls;

    }


    // calculate distance from camera to given ball in cm using centroid and radius
    #getRange(ball) {
        return this.ballRadius / (Math.sin(ball.radius));
    }


    // Given lengths of three sides of a triangle (A, B and C), calculate the XY position of the point where B meets C (camera position)
    // A is the distance between the balls which is known, and this defines the X axis
    // B and C are the distances from the camera to two different balls - based on result of this.#getRange()
    // The origin is where A meets C
    // There may be simpler or more standard way to do this, but I derived this from pythagoras and it seems to work!
    #trilaterate(A, B, C) {
        const x = (Math.pow(B, 2) - Math.pow(A, 2) - Math.pow(C, 2)) / (2 * A);
        const y = Math.sqrt(Math.pow(C, 2) - Math.pow(x, 2));
        return { x, y };
    }


    // return the string representation of the collector
    // a string of space-separated XY pairs on each line
    toString() {
        return pointsArrayToTextLines(this.collector);
    }

}