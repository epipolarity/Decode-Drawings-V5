import BallContourDectector from './ballContourDetector.js';

let inputId;

const video = document.createElement("video");
const inputCtx = inputCanvas.getContext("2d");

const contourDetector = new BallContourDectector();


const processFrame = () => {

    const { width, height } = inputCanvas;

    inputCtx.drawImage(video, 0, 0, width, height);

    const imageData = inputCtx.getImageData(0, 0, width, height);

    const { contours } = contourDetector.detect(imageData);

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

const handleTimeChange = () => {
    video.currentTime = timeSlider.value;
}


const loadSelectedVideo = () => {
    inputId = videos.value;
    video.src = `videos/${inputId}.mp4`;

    const intervalHandle = setInterval(() => {
        if (parseInt(timeSlider.value) < parseInt(timeSlider.max)) {
            timeSlider.value = parseInt(timeSlider.value) + 1;
            handleTimeChange();
        } else {
            clearInterval(intervalHandle);
        }
    }, 500);
}


video.addEventListener('seeked', processFrame);


timeSlider.addEventListener('change', handleTimeChange);


window.addEventListener('DOMContentLoaded', loadSelectedVideo);


videos.addEventListener("change", loadSelectedVideo);


video.addEventListener("loadeddata", () => {

    inputCanvas.width = video.videoWidth;
    inputCanvas.height = video.videoHeight;

    video.currentTime = 0;

    timeSlider.style = `width: ${video.videoWidth}px`

    timeSlider.removeAttribute("disabled");

    timeSlider.value = 0;
    timeSlider.min = 0;
    timeSlider.max = video.duration;

});
