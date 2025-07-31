import { objectToJSConst, round, averagePoint } from './utils.js';

const CHANNELS = ["Red", "Green", "Blue"];

// Ball detector based heavily on Radu's Colored Marker Detector code: https://www.youtube.com/watch?v=jy-Mxbt0zww
export default class BallContourDetector {

    constructor(activePoints = 15, colorThresholds = [40, 40, 40], precision = 1) {
        this.collector = [];                                            // array to add results of ball contour detection for each frame
        this.activePoints = activePoints;                               // how many points in each ball contour
        this.colorThresholds = colorThresholds;                         // how 'strong' each colour needs to be to be considered part of a ball
        this.precision = precision;                                     // decimal places for detection results
    }


    // take an ImageData object and return a set of contours defining the outline of each ball in the image
    detect(imgData) {

        const rgbPoints = CHANNELS.map(() => []);                       // arrays to hold pixels that meet the criteria for each color

        for (let i = 0; i < imgData.data.length; i += 4) {              // get the r g b values for each pixel

            const pIndex = i / 4;                                       // convert from 1D index to 2D XY coordinates
            const y = Math.floor(pIndex / imgData.width);
            const x = pIndex % imgData.width;

            for (let channel = 0; channel < CHANNELS.length; channel++) {

                const colorStrength = this.#getColourStrength(imgData, i, channel);                     // use Radu's method for measuring colour strength

                if (colorStrength > this.colorThresholds[channel]) {                                    // store the pixels that meet the threshold for each colour
                    rgbPoints[channel].push({ x, y });
                }

            }

        }

        // make a first guess of centroid and radius from which to refine the contour
        const centroids = rgbPoints.map(channelPoints => averagePoint(channelPoints));                  
        const radii = rgbPoints.map(channelPoints => Math.sqrt(channelPoints.length) / 1.8);

        // for each ball refine the initial guess of where the contour is
        // first initialise a set of points in a circle around the estimated centroid at the estimated radius
        // then refine those points in and out until they lie on the colour strength threshold/boundary
        const balls = {
            contours: {
                red: this.#refinePoints(this.#initPoints(centroids[0], radii[0]), imgData, 0),
                green: this.#refinePoints(this.#initPoints(centroids[1], radii[1]), imgData, 1),
                blue: this.#refinePoints(this.#initPoints(centroids[2], radii[2]), imgData, 2)
            }
        }

        // keep a record of the contours for this frame
        this.collector.push(balls);

        // return the contours for this frame
        return balls;

    }



    // return the string representation of the collector - a js module with single 'balls' const export
    toString() {
        return objectToJSConst(this.collector, 'balls');
    }


    // Radu's method for determining colour strength
    // the difference between the intensity of this channel and the max of the other two
    #getColourStrength(imgData, idx, channel) {
        const thisChannel = imgData.data[idx + channel];
        const otherChannel1 = imgData.data[idx + (channel + 1) % 3];
        const otherChannel2 = imgData.data[idx + (channel + 2) % 3];

        return thisChannel - Math.max(otherChannel1, otherChannel2);
    }


    // takes a set of 'active points', an image, and a colour channel and jiggles the points until they 
    // lie on the boundary between above and below the colour strength threshold for that channel
    #refinePoints(points, imgData, channel, iterations = 50, searchSize = 3) {

        const refinedPoints = points.map(point => ({ x: point.x, y: point.y }));                            // take a copy of the points as this will be modified

        let iteration = 0;

        let converged = false;
        const convergenceCriteria = 0.1;                                                                    // this should be a parameter
                                                                                                            // in fact the whole thing could be much more generalised
        while (iteration < iterations && !converged) {

            const meanPoint = averagePoint(refinedPoints);                                                  // get the average position of all points as a reference to move towards or away from
            converged = true;

            for (let i = 0; i < refinedPoints.length; i++) {

                const centre = { x: Math.round(refinedPoints[i].x), y: Math.round(refinedPoints[i].y) };    // define the centre of the search area as the current point
                const neighbours = [];

                for (let x = centre.x - searchSize; x <= centre.x + searchSize; x++) {                      // get the colour strength of each pixel (neighbour) in the search area
                    for (let y = centre.y - searchSize; y <= centre.y + searchSize; y++) {
                        if (x >= 0 && y >= 0 && x <= imgData.width && y <= imgData.height) {
                            const index = 4 * (x + (y * imgData.width));
                            neighbours.push(this.#getColourStrength(imgData, index, channel));
                        }
                    }
                }

                const proportionOverThreshold = neighbours.reduce(
                    (count, intensity) => count + (intensity > this.colorThresholds[channel] ? 1 : 0),      // count the number of neighbours that exceed the threshold
                    0
                ) / neighbours.length;                                                                      // and divide by total number of neighbours to get a proportion

                const netEffect = proportionOverThreshold - 0.5;                                            // subtract 0.5 so the effect is negative if <50% were above threshold

                // get distance from each point to the contour mean point                                                                                                    
                const distance = Math.sqrt(Math.pow(refinedPoints[i].x - meanPoint.x, 2) + Math.pow(refinedPoints[i].y - meanPoint.y, 2));

                // and use this to normalise a unit vector indicating the direction of movement relative to the mean
                const repulsionDirection = {
                    x: (refinedPoints[i].x - meanPoint.x) / distance,
                    y: (refinedPoints[i].y - meanPoint.y) / distance
                }

                // multiply this direction vector by the 'netEffect' to get an inward or outward vector to add to each point, jiggling it towards the threshold/boundary
                refinedPoints[i].x += netEffect * repulsionDirection.x;
                refinedPoints[i].y += netEffect * repulsionDirection.y;

                if (Math.abs(netEffect) > convergenceCriteria) {                                            // check for convergence to enable early stopping
                    converged = false;
                }

            }

            iteration++;

        }

        return refinedPoints.map(point => ({                                                                // round numbers as this data makes big text files
            x: round(point.x, this.precision),                                                              // and it's not really very accurate (or sophisticated) anyway
            y: round(point.y, this.precision)
        }));

    }


    // return a set of points in a circle around a given centroid at a given radius
    #initPoints(centre, radius) {
        const points = [];
        for (let i = 0; i < this.activePoints; i++) {
            const angle = Math.PI * 2 * i / this.activePoints;
            points.push({
                x: centre.x + Math.cos(angle) * radius,
                y: centre.y + Math.sin(angle) * radius
            })
        }
        return points;
    }

}