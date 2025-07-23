import BallContourDetector from "./ballContourDetector.js";
import DrawingDecoder from "./drawingDecoderV5.js";

import { downloadText, truncate, map } from "./utils.js";
import { checkCircle } from "./circleFit.js";

let inputId;                    // input (video or data file) to be processed
let datafileMode = false;       // is input a video or data file

let videoPlaying = false;

let detectorTextUpdateInterval; // interval ids for updating textareas with output during video processing
let decoderTextUpdateInterval;

let ballDetector;               // class to detect balls in input video
let drawingDecoder;             // class to decode drawing based on detected ball positions/sizes

const video = document.createElement("video");

const inputCtx = inputCanvas.getContext("2d");
const drawingCtx = drawingCanvas.getContext("2d");


// Event handlers

// video loaded so begin processing of video frames
video.addEventListener("loadeddata", () => {
    clearTextareas();                               // clear previous output
    clearDrawingContext();

    inputCanvas.style.display = "block";
    inputCanvas.width = video.videoWidth;
    inputCanvas.height = video.videoHeight;

    ballDetector = new BallContourDetector();
    drawingDecoder = createDecoder();               // create decoder instance based on selected version

    // set up intervals to update textarea outputs
    decoderTextUpdateInterval = setInterval(() => updateText(xyCoords, drawingDecoder), 500);
    detectorTextUpdateInterval = setInterval(() => updateText(ballCoords, ballDetector), 500);

    videoPlaying = true;
    processVideoFrame();                            // start processing
});


// video finished so enable download buttons
video.addEventListener("ended", () => {
    videoPlaying = false;
    downloadReady();
});


// video input selector changed
videos.addEventListener("change", (e) => {
    datafileMode = false;

    downloadXYCoordsBtn.setAttribute("disabled", "true");       // disable download buttons until processing complete
    downloadBallCoordsJS.setAttribute("disabled", "true");

    inputId = e.target.value;

    video.src = `videos/${inputId}.mp4`;                        // prepare video element with the selected source and play
    video.muted = true;
    video.play();
});


// data file input selector changed
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


[smoothing, zthresh, checkZ, focalLengthX, focalLengthY, opticalCentreX, opticalCentreY, k1,
    tiltXFactor, tiltYFactor, checkFitCircle].forEach(element => element.addEventListener("change", () => {
        if (datafileMode) {
            drawDatafile();
        }
    }));


// download the decoded XY image coordinates in TXT format for the https://radufromfinland.com/decodeTheDrawings/test/ test page
downloadXYCoordsBtn.addEventListener("click", () => {
    const content = drawingDecoder.toString();
    downloadText(content, 'coords_' + inputId + '.txt');
});


// download the detected ball positions and sizes as a JS const export to save having to play the video each time
downloadBallCoordsJS.addEventListener("click", () => {
    const content = ballDetector.toString(inputId);
    downloadText(content, 'balls_' + inputId + '.js', 'text/javascript');
});


// decode the selected data file input and draw to the canvas
function drawDatafile() {

    // clear previous output
    clearTextareas();
    clearDrawingContext();
    setTimeout(clearInputContext, 250);                         // clear input video canvas with a delay in case it is still playing

    const ballsDataFile = `../data/balls_${inputId}.js`;        // path to the selected data file

    import(ballsDataFile).then(ballsModule => {                 // dynamic import to handle error if it doesn't exist

        drawingDecoder = createDecoder();                       // get a decoder of the currently selected type
        for (const balls of ballsModule.balls) {
            drawingDecoder.decode(drawingCtx, balls.contours);           // decode each set of balls and draw onto the drawing canvas
        }

        updateText(xyCoords, drawingDecoder);                   // display the XY image coordinates and make available for download as TXT
        downloadReady();

        if (checkFitCircle.checked) {

            let status = "Not enough points!";
            if (drawingDecoder.collector.length > 2) {
                const circleFit = checkCircle(drawingDecoder.collector, drawingCtx);
                status = circleFit.toFixed(4);
            }
            drawingCtx.save();
            drawingCtx.fillStyle = "red";
            drawingCtx.font = "30px arial";
            drawingCtx.fillText(status, 10, 40);
            drawingCtx.restore();
        }

        drawXYDistributions(drawingDecoder.collector, drawingDecoder.rejected);

    }).catch(error => {

        console.error(error);
        alert(`error processing balls_${inputId}.js - check console for more info`);
        datafiles.selectedIndex = 0;

    });
}


function drawXYDistributions(points, rejectedPoints = [], zScale = 10) {

    const xDistCtx = xDistCanvas.getContext("2d");
    const yDistCtx = yDistCanvas.getContext("2d");

    xDistCtx.fillStyle = "white";
    xDistCtx.fillRect(0, 0, xDistCanvas.width, xDistCanvas.height);

    yDistCtx.fillStyle = "white";
    yDistCtx.fillRect(0, 0, yDistCanvas.width, yDistCanvas.height);

    xDistCtx.fillStyle = "black";
    yDistCtx.fillStyle = "black";

    for (let i = 0; i < points.length; i++) {
        xDistCtx.beginPath();
        xDistCtx.rect(points[i].x, map(points[i].z, 0, zScale, 0, xDistCanvas.height), 2, 2);
        xDistCtx.fill();

        yDistCtx.beginPath();
        yDistCtx.rect(map(points[i].z, 0, zScale, 0, yDistCanvas.width), points[i].y, 2, 2);
        yDistCtx.fill();
    }

    xDistCtx.fillStyle = "red";
    yDistCtx.fillStyle = "red";

    for (let i = 0; i < rejectedPoints.length; i++) {
        xDistCtx.beginPath();
        xDistCtx.rect(rejectedPoints[i].x, map(rejectedPoints[i].z, 0, zScale, 0, xDistCanvas.height), 2, 2);
        xDistCtx.fill();

        yDistCtx.beginPath();
        yDistCtx.rect(map(rejectedPoints[i].z, 0, zScale, 0, yDistCanvas.width), rejectedPoints[i].y, 2, 2);
        yDistCtx.fill();
    }

    if (checkZ.checked) {
        xDistCtx.strokeStyle = "red";
        xDistCtx.lineWidth = "3";
        xDistCtx.beginPath();
        xDistCtx.moveTo(0, map(parseFloat(zthresh.value), 0, zScale, 0, xDistCanvas.height));
        xDistCtx.lineTo(xDistCanvas.width, map(parseFloat(zthresh.value), 0, zScale, 0, xDistCanvas.height));
        xDistCtx.stroke();

        yDistCtx.strokeStyle = "red";
        yDistCtx.lineWidth = "3";
        yDistCtx.beginPath();
        yDistCtx.moveTo(map(parseFloat(zthresh.value), 0, zScale, 0, yDistCanvas.width), 0);
        yDistCtx.lineTo(map(parseFloat(zthresh.value), 0, zScale, 0, yDistCanvas.width), yDistCanvas.height);
        yDistCtx.stroke();
    }

}


// process the selected video file input and draw to canvas
function processVideoFrame() {

    const { width, height } = inputCanvas;
    inputCtx.drawImage(video, 0, 0, width, height);                         // draw the video to the video input canvas

    const imageData = inputCtx.getImageData(0, 0, width, height);           // get the frame image data and perform ball detection
    const { contours } = ballDetector.detect(imageData);

    drawContours(contours);

    drawingDecoder.decode(drawingCtx, contours);                               // decode each set of balls and draw onto the drawing canvas

    if (videoPlaying) {
        video.requestVideoFrameCallback(processVideoFrame);                 // repeat for each video frame
    }
}


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


// factory function to create a DrawingDecoder of the selected version
function createDecoder() {

    const smoothingValue = parseFloat(smoothing.value);
    const zThreshhold = parseFloat(zthresh.value);
    const checkZThreshold = checkZ.checked;
    const focalLength = {
        x: parseFloat(focalLengthX.value),
        y: parseFloat(focalLengthY.value)
    };
    const opticalCentre = {
        x: parseFloat(opticalCentreX.value),
        y: parseFloat(opticalCentreY.value)
    };
    const k1Coefficient = parseFloat(k1.value);
    const tiltFactor = {
        x: parseFloat(tiltXFactor.value),
        y: parseFloat(tiltYFactor.value)
    };

    return new DrawingDecoder(
        smoothingValue,
        zThreshhold,
        checkZThreshold,
        focalLength,
        opticalCentre,
        k1Coefficient,
        tiltFactor
    );
}


// write text from any 'provider' with toString() method, to given textarea, truncated at 'limit' characters
function updateText(textArea, provider, limit = 10000) {
    const result = truncate(provider.toString(inputId), limit);
    textArea.value = result;
    textArea.scrollTop = textArea.scrollHeight;
}


// stop updating textareas and enable download buttons
function downloadReady() {
    clearInterval(decoderTextUpdateInterval);
    downloadXYCoordsBtn.removeAttribute("disabled");

    if (datafileMode) return;                                       // return early if ball detection was not performed

    clearInterval(detectorTextUpdateInterval);
    downloadBallCoordsJS.removeAttribute("disabled");
}


function clearTextareas() {
    xyCoords.value = "";
    ballCoords.value = "";
}


function clearDrawingContext() {
    drawingCtx.fillStyle = "white";
    drawingCtx.fillRect(0, 0, drawingCanvas.width, drawingCanvas.height);
}


function clearInputContext() {
    inputCtx.fillStyle = "white";
    inputCtx.fillRect(0, 0, inputCanvas.width, inputCanvas.height);
}