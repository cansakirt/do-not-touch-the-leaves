import { HandLandmarker, FilesetResolver, GestureRecognizer } from "./vision_bundle.mjs";
document.getElementById("message").innerHTML = "Loading models...";
let handLandmarker = undefined;
let gestureRecognizer = undefined;
let runningMode = "IMAGE";
let enableWebcamButton;
let webcamRunning = false;

const combinedModels = async (device) => {
  const vision = await FilesetResolver.forVisionTasks("./wasm");
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `./models/hand_landmarker.task`,
      delegate: device,
    },
    runningMode: runningMode,
    numHands: 2,
  });
  document.getElementById("message").innerHTML = "✅ Loaded: hand_landmarker<br>";

  gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `./models/gesture_recognizer.task`,
      delegate: device,
    },
    runningMode: runningMode,
  });
  document.getElementById("message").innerHTML += "✅ Loaded: gesture_recognizer";

  // Set a timeout to clear the message after 5 seconds
  setTimeout(() => {
    document.getElementById("message").innerHTML = "";
  }, 5000);
};
combinedModels("GPU");
// combinedModels("CPU");
// Demo: Continuously grab image from webcam stream and detect it.
const video = document.getElementById("webcam");
const canvasElement = document.getElementById("canvas");

// Check if webcam access is supported.
const hasGetUserMedia = () => {
  var _a;
  return !!((_a = navigator.mediaDevices) === null || _a === void 0 ? void 0 : _a.getUserMedia);
};
// If webcam supported, add event listener to button for when user
// wants to activate it.
if (hasGetUserMedia()) {
  enableWebcamButton = document.getElementById("webcam-button");
  enableWebcamButton.addEventListener("click", enableCam);
} else {
  console.warn("getUserMedia() is not supported by your browser");
}

// Enable the live webcam view and start detection.
function enableCam(event) {
  if (!handLandmarker && !gestureRecognizer) {
    console.log("Wait! handLandmarker and gestureRecognizer not loaded yet.");
    return;
  }
  if (webcamRunning === true) {
    webcamRunning = false;
    enableWebcamButton.innerText = "ENABLE INTERACTION";
  } else {
    webcamRunning = true;
    enableWebcamButton.innerText = "DISABLE INTERACTIONS";
  }
  // getUsermedia parameters.
  const constraints = {
    video: true,
  };
  // Activate the webcam stream.
  navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
    video.srcObject = stream;
    video.addEventListener("loadeddata", predictWebcam);
  });
}

let lastVideoTime = -1;
let results = undefined;
let results_gesture = undefined;
console.log(video);

async function predictWebcam() {
  // Now let's start detecting the stream.
  if (runningMode === "IMAGE") {
    runningMode = "VIDEO";
    await handLandmarker.setOptions({ runningMode: "VIDEO" });
    await gestureRecognizer.setOptions({ runningMode: "VIDEO" });
  }
  let startTimeMs = performance.now();
  if (lastVideoTime !== video.currentTime) {
    lastVideoTime = video.currentTime;
    results = handLandmarker.detectForVideo(video, startTimeMs);
    results_gesture = gestureRecognizer.recognizeForVideo(video, startTimeMs);
  }
  gotHands(results, results_gesture);
  // Call this function again to keep predicting when the browser is ready.
  if (webcamRunning === true) {
    window.requestAnimationFrame(predictWebcam);
  }
}
