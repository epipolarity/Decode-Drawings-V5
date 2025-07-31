// handy functions

// linear mapping of value from range fromMin->fromMax to range toMin->toMax
function map(val, fromMin, fromMax, toMin, toMax) {
    const fromRange = fromMax - fromMin;
    const toRange = toMax - toMin;
    return toMin + (toRange * (val - fromMin) / fromRange);
}


// round a number to given precision
// not a perfect implementation but just needed to get rid of some decimal places
// for file size and readability
function round(value, precision) {
    const scaler = Math.pow(10, precision);
    return Math.round(value * scaler) / scaler;
}


// convert an array of points to a string with each XY on a new line
// used for exporting XY image coords text file
function pointsArrayToTextLines(array) {
    return array.map(point => point.x + " " + point.y).join("\n");
}


// convert an object to a javascript module that exports that object as a constant
// used for exporting ball contour detection result to JS modules for dynamic import
// so we don't have to watch the video every time we tweak the algorithms
function objectToJSConst(object, name) {
    return `export const ${name} = ${JSON.stringify(object, null, 2)};`;
}


// convert a string to a blob and trigger a text file download
// borrowed from https://www.tutorialspoint.com/how-to-create-and-save-text-file-in-javascript
function downloadText(content, filename, type = 'text/plain') {
    const link = document.createElement("a");
    const file = new Blob([content], { type });
    link.href = URL.createObjectURL(file);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
}


// truncate text to given char limit without truncating part way through a line
function truncate(text, limit) {
    if (text.length <= limit) {
        return text;
    }
    const lastLine = text.lastIndexOf('\n', limit);
    return text.substring(0, lastLine) + '\n...';
}


// pythagoras distance calculation
function distance(p1, p2) {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}


// work out the angle from the optical axis to a point in the image in x and y
// using simple trigonometry
// focal length is the adjacent side
// point offset from optical centre is the opposite side
// angle is arctangent of opposite/adjacent
function cartesianToAngular(point, focalLength, opticalCentre) {
    const { x, y } = point;
    const { x: fx, y: fy } = focalLength;
    const { x: cx, y: cy } = opticalCentre;
    return {
        x: Math.atan((x - cx) / fx),
        y: Math.atan((y - cy) / fy)
    }
}


// calculate the mean XY point of an array of XY points
function averagePoint(points) {
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


export {
    map,
    round,
    pointsArrayToTextLines,
    objectToJSConst,
    downloadText,
    truncate,
    distance,
    cartesianToAngular,
    averagePoint
};