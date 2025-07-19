const CHANNELS = ["Red", "Green", "Blue"];

// Ball detector based heavily on Radu's Colored Marker Detector code: https://www.youtube.com/watch?v=jy-Mxbt0zww
export default class BallContourDetector {

    constructor(activePoints = 15, colorThresholds = [40, 40, 40]) {
        this.activePoints = activePoints;
        this.colorThresholds = colorThresholds;
    }


    detect(imgData) {

        const rgbPoints = CHANNELS.map(() => []);                       // arrays to hold pixels that the criteria for each color

        for (let i = 0; i < imgData.data.length; i += 4) {              // get the r g b values for each pixel

            const pIndex = i / 4;                                       // convert from 1D index to 2D XY coordinates
            const y = Math.floor(pIndex / imgData.width);
            const x = pIndex % imgData.width;

            for (let channel = 0; channel < CHANNELS.length; channel++) {

                const colorStrength = this.#getColourStrength(imgData, i, channel);

                if (colorStrength > this.colorThresholds[channel]) {
                    rgbPoints[channel].push({ x, y });
                }

            }

        }

        const centroids = rgbPoints.map(channelPoints => this.#averagePoints(channelPoints));
        const radii = rgbPoints.map(channelPoints => Math.sqrt(channelPoints.length) / 1.8);

        return {
            contours: {
                red: this.#refinePoints(this.#initPoints(centroids[0], radii[0]), imgData, 0),
                green: this.#refinePoints(this.#initPoints(centroids[1], radii[1]), imgData, 1),
                blue: this.#refinePoints(this.#initPoints(centroids[2], radii[2]), imgData, 2)
            }
        }

    }


    #getColourStrength(imgData, idx, channel) {
        const thisChannel = imgData.data[idx + channel];
        const otherChannel1 = imgData.data[idx + (channel + 1) % 3];
        const otherChannel2 = imgData.data[idx + (channel + 2) % 3];

        return thisChannel - Math.max(otherChannel1, otherChannel2);
    }


    #refinePoints(points, imgData, channel, iterations = 50, searchSize = 3) {

        const refinedPoints = points.map(point => ({ x: point.x, y: point.y }));

        let iteration = 0;

        let converged = false;
        const convergenceCriteria = 0.1;

        while (iteration < iterations && !converged) {

            const meanPoint = this.#averagePoints(refinedPoints);
            converged = true;

            for (let i = 0; i < refinedPoints.length; i++) {

                const centre = { x: Math.round(refinedPoints[i].x), y: Math.round(refinedPoints[i].y) };
                const neighbours = [];

                for (let x = centre.x - searchSize; x <= centre.x + searchSize; x++) {
                    for (let y = centre.y - searchSize; y <= centre.y + searchSize; y++) {
                        if (x >= 0 && y >= 0 && x <= imgData.width && y <= imgData.height) {
                            const index = 4 * (x + (y * imgData.width));
                            neighbours.push(this.#getColourStrength(imgData, index, channel));
                        }
                    }
                }

                const proportionOverThreshold = neighbours.reduce(
                    (count, intensity) => count + (intensity > this.colorThresholds[channel] ? 1 : 0),
                    0
                ) / neighbours.length;

                const netEffect = proportionOverThreshold - 0.5;

                const distance = Math.sqrt(Math.pow(refinedPoints[i].x - meanPoint.x, 2) + Math.pow(refinedPoints[i].y - meanPoint.y, 2));

                const repulsionDirection = {
                    x: (refinedPoints[i].x - meanPoint.x) / distance,
                    y: (refinedPoints[i].y - meanPoint.y) / distance
                }

                refinedPoints[i].x += netEffect * repulsionDirection.x;
                refinedPoints[i].y += netEffect * repulsionDirection.y;

                if (Math.abs(netEffect) > convergenceCriteria) {
                    converged = false;
                }

            }

            iteration++;

        }

        return refinedPoints;

    }


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


    // calculate the mean XY point of an array of XY points
    #averagePoints(points) {
        const center = { x: 0, y: 0 };
        for (const point of points) {
            center.x += point.x;
            center.y += point.y;
        }
        center.x /= points.length;
        center.y /= points.length;
        return {
            x: center.x,
            y: center.y
        };
    }
}