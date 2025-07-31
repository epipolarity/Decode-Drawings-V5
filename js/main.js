import BallContourDetector from "./ballContourDetector.js";
import DrawingDecoder from "./drawingDecoderV5.js";

import { downloadText, truncate, map } from "./utils.js";
import { checkCircle } from "./circleFit.js";


let inputId;                                                // input (video or data file) to be processed
let datafileMode = false;                                   // is input a video or data file

let videoPlaying = false;

let ballContourDetector;                                    // class to detect ball contours in input video
let drawingDecoder;                                         // class to decode drawing based on detected ball contours

const video = document.createElement("video");              // to load the input video if selected

const inputCtx = inputCanvas.getContext("2d");              // to display the input video and detected contour overlay
const drawingCtx = drawingCanvas.getContext("2d");          // to draw the decoded image


// Event handlers

// begin processing of video frames once video is loaded
video.addEventListener("loadeddata", () => {
    clearTextareas();                                       // clear previous output
    clearDrawingContext();

    inputCanvas.style.display = "block";                    // make video canvas visible
    inputCanvas.width = video.videoWidth;
    inputCanvas.height = video.videoHeight;

    ballContourDetector = new BallContourDetector();        // create contour detector (because an old one will have history of previous input)
    drawingDecoder = createDecoder();                       // create decoder instance based on selected version

    videoPlaying = true;
    processVideoFrame();                                    // start processing
});


// enable download buttons once the video has finished to enable export of the results
video.addEventListener("ended", () => {
    videoPlaying = false;
    updateText(ballCoords, ballContourDetector);
    updateText(xyCoords, drawingDecoder);
    downloadReady();
});


// change video source when video selector is changed
videos.addEventListener("change", (e) => {
    datafileMode = false;

    downloadXYCoordsBtn.setAttribute("disabled", "true");       // disable download buttons until processing complete
    downloadBallCoordsJS.setAttribute("disabled", "true");

    inputId = e.target.value;

    video.src = `videos/${inputId}.mp4`;                        // prepare video element with the selected source and play
    video.muted = true;
    video.play();
});


// trigger data file processing when data file input selector changed
datafiles.addEventListener("change", (e) => {
    datafileMode = true;                                        // switch to data file input mode

    downloadXYCoordsBtn.setAttribute("disabled", "true");       // disable download buttons until processing complete
    downloadBallCoordsJS.setAttribute("disabled", "true");

    video.pause();                                              // stop video if there is one
    videoPlaying = false;
    videos.selectedIndex = 0;

    inputId = e.target.value;                                   // set the input id and start processing
    drawDatafile();
});


// add same event handler to all form inputs to trigger instand data file reprocessing
[
    smoothing,
    zthresh, checkZ,
    focalLengthX, focalLengthY,
    opticalCentreX, opticalCentreY,
    k1,
    tiltXFactor, tiltYFactor,
    ballRadius,
    checkFitCircle
].forEach(element => element.addEventListener("change", () => {
    if (datafileMode) {
        drawDatafile();
    }
}));

// trigger data file reprocessing if the form is reset to default values
reset.addEventListener("click", () => {
    if (datafileMode) {
        drawDatafile();
    }
})


// download the decoded XY image coordinates in TXT format for the https://radufromfinland.com/decodeTheDrawings/test/ test page
downloadXYCoordsBtn.addEventListener("click", () => {
    const content = drawingDecoder.toString();
    downloadText(content, 'coords_' + inputId + '.txt');
});


// download the detected ball contours as a JS const export to save having to play the video each time
downloadBallCoordsJS.addEventListener("click", () => {
    const content = ballContourDetector.toString(inputId);
    downloadText(content, 'balls_' + inputId + '.js', 'text/javascript');
});


// process the selected data file input and draw the decoded image to the canvas
function drawDatafile() {

    clearTextareas();                                                   // clear previous output
    clearDrawingContext();
    setTimeout(clearInputContext, 250);                                 // clear input video canvas with a delay in case it is still playing

    const ballsDataFile = `../data/balls_${inputId}.js`;                // path to the selected data file

    import(ballsDataFile).then(ballsModule => {                         // dynamic import to handle error if it doesn't exist

        drawingDecoder = createDecoder();                               // get a new decoder with the current decoder settings
        for (const balls of ballsModule.balls) {
            drawingDecoder.decode(balls.contours, drawingCtx);          // decode each set of ball contours and draw onto the drawing canvas
        }

        updateText(xyCoords, drawingDecoder);                           // display the XY image coordinates 
        downloadReady();                                                // and make available for download as TXT

        if (checkFitCircle.checked) {                                   // check how well the drawing matches a perfect circle

            let status = "Not enough points!";
            if (drawingDecoder.collector.length > 2) {                  // the checkCircle function will draw the circle to the canvas
                const circleFit = checkCircle(drawingDecoder.collector, drawingCtx);
                status = circleFit.toFixed(4);
            }
            drawingCtx.save();
            drawingCtx.fillStyle = "red";
            drawingCtx.font = "30px arial";
            drawingCtx.fillText(status, 10, 40);                        // add the circle fit error on the canvas to enable instant feedback when tweaking parameters
            drawingCtx.restore();
        }

        // draw the decoded XYZ values as XZ and YZ plots too, to enable tweaking parameters 
        // to ensure the  decoded image is as flat as possible to set a suitable Z threshold
        drawZDistributions(drawingDecoder.collector, drawingDecoder.rejected);

    }).catch(error => {                                                 // the requested data file couldn't be loaded (or there was an error processing it)

        console.error(error);
        alert(`error processing balls_${inputId}.js - check console for more info`);
        datafiles.selectedIndex = 0;

    });
}


//  process the selected video file input and draw the decoded image to the canvas
function processVideoFrame() {

    const { width, height } = inputCanvas;
    inputCtx.drawImage(video, 0, 0, width, height);                         // draw the video to the video input canvas

    const imageData = inputCtx.getImageData(0, 0, width, height);           // get the frame image data and perform ball contour detection
    const { contours } = ballContourDetector.detect(imageData);

    drawContours(contours);

    drawingDecoder.decode(contours, drawingCtx);                            // decode each set of contours and draw onto the drawing canvas

    if (videoPlaying) {
        video.requestVideoFrameCallback(processVideoFrame);                 // repeat for each video frame
    }
}


// draw the detected ball contour/outlines overlaid on the video canvas to check accuracy
function drawContours(contours) {

    inputCtx.lineWidth = 2;
    inputCtx.strokeStyle = "white";
    inputCtx.fillStyle = "yellow";
    inputCtx.font = "12px arial";
    for (const ballKey in contours) {
        const contour = contours[ballKey];
        inputCtx.beginPath();
        inputCtx.moveTo(contour[0].x, contour[0].y);
        inputCtx.fillText(0, contour[0].x, contour[0].y);
        for (let i = 1; i < contour.length; i++) {
            inputCtx.lineTo(contour[i].x, contour[i].y);
            inputCtx.fillText(i, contour[i].x, contour[i].y);
        }
        inputCtx.lineTo(contour[0].x, contour[0].y);
        inputCtx.stroke();
    }

}


// factory function to create a DrawingDecoder using the chosen parameters from the HTML form
function createDecoder() {

    const focalLength = {
        x: parseFloat(focalLengthX.value),
        y: parseFloat(focalLengthY.value)
    };
    const opticalCentre = {
        x: parseFloat(opticalCentreX.value),
        y: parseFloat(opticalCentreY.value)
    };
    const tiltFactor = {
        x: parseFloat(tiltXFactor.value),
        y: parseFloat(tiltYFactor.value)
    };

    return new DrawingDecoder({
        smooth: parseFloat(smoothing.value),
        zThreshold: parseFloat(zthresh.value),
        checkZ: checkZ.checked,
        focalLength,
        opticalCentre,
        k1: parseFloat(k1.value),
        tiltFactor,
        ballRadius: parseFloat(ballRadius.value)
    });
}


// function to draw the XZ and YZ views of the 3d points from the drawing decoder
// rejectedPoints are above the threshold/considered 'off the page' and if provided are drawn in red
// scale is the range of z values that fill the respective canvas
// scale = 10 means z values from 0-10 cover the full height/width of the respective canvas
function drawZDistributions(points, rejectedPoints = [], scale = 10) {

    // draw points on the appropriate canvas for each axis    
    drawZPoints(points, xDistCanvas, { axis: "x", scale });
    drawZPoints(points, yDistCanvas, { axis: "y", scale });

    // do the same for rejected points, but draw red and do not clear previous points (drawn immediately prior, above)
    drawZPoints(rejectedPoints, xDistCanvas, { colour: "red", axis: "x", scale, clear: false });
    drawZPoints(rejectedPoints, yDistCanvas, { colour: "red", axis: "y", scale, clear: false });

    // if checking z threshold, draw the z threshold on each canvas as a thick red line
    if (checkZ.checked) {

        // get contexts of the canvases to the side and below the main drawing canvas
        const xDistCtx = xDistCanvas.getContext("2d");
        const yDistCtx = yDistCanvas.getContext("2d");

        xDistCtx.strokeStyle = "red";
        xDistCtx.lineWidth = "3";
        xDistCtx.beginPath();
        xDistCtx.moveTo(0, map(parseFloat(zthresh.value), 0, scale, 0, xDistCanvas.height));
        xDistCtx.lineTo(xDistCanvas.width, map(parseFloat(zthresh.value), 0, scale, 0, xDistCanvas.height));
        xDistCtx.stroke();

        yDistCtx.strokeStyle = "red";
        yDistCtx.lineWidth = "3";
        yDistCtx.beginPath();
        yDistCtx.moveTo(map(parseFloat(zthresh.value), 0, scale, 0, yDistCanvas.width), 0);
        yDistCtx.lineTo(map(parseFloat(zthresh.value), 0, scale, 0, yDistCanvas.width), yDistCanvas.height);
        yDistCtx.stroke();

    }

}


// draw the provided 3d points on the specified canvas showing z against the specified 'axis'
function drawZPoints(points, canvas, {
    colour = "black",
    axis = "x",
    scale = 1,
    clear = true
} = {}) {

    const ctx = canvas.getContext("2d");

    if (clear) {                                                        // option to not clear the canvas when adding extra points
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.fillStyle = colour;

    for (const point of points) {                                       // plot z values against the specified axis (x or y)
        ctx.beginPath();                                                // on the given canvas
        if (axis === "x") {
            ctx.rect(point.x, map(point.z, 0, scale, 0, canvas.height), 2, 2);
        } else {
            ctx.rect(map(point.z, 0, scale, 0, canvas.width), point.y, 2, 2);
        }
        ctx.fill();
    }

}


// write text from any 'provider' with toString() method, to given textarea, truncated at 'limit' characters
function updateText(textArea, provider, limit = 10000) {
    textArea.textContent = truncate(provider.toString(inputId), limit);
    textArea.scrollTop = textArea.scrollHeight;
}


// stop updating textareas and enable download buttons
function downloadReady() {
    downloadXYCoordsBtn.removeAttribute("disabled");
    if (!datafileMode) {
        downloadBallCoordsJS.removeAttribute("disabled");
    }
}


function clearTextareas() {
    xyCoords.textContent = "";
    ballCoords.textContent = "";
}


function clearDrawingContext() {
    drawingCtx.fillStyle = "white";
    drawingCtx.fillRect(0, 0, drawingCanvas.width, drawingCanvas.height);
}


function clearInputContext() {
    inputCtx.fillStyle = "white";
    inputCtx.fillRect(0, 0, inputCanvas.width, inputCanvas.height);
}