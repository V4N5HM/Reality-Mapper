const video = document.getElementById("video");
const overlay = document.getElementById("overlay");
const ctx = overlay.getContext("2d");
const sessionCode = sessionStorage.getItem("sessionCode") || "1";

let boxes = [];
let currentDetections = [];
let lastDetectionTime = 0;
let currentStream = null;
let usingFront = false;

// Start camera with fallback
async function startCamera(facing = "environment") {
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
  }

  try {
    const constraints = { video: { facingMode: { exact: facing } } };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    handleStream(stream);
  } catch (err) {
    console.warn(`Exact facingMode failed (${facing}), falling back...`, err);
    try {
      const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
      handleStream(fallbackStream);
    } catch (fallbackErr) {
      console.error("Camera fallback failed:", fallbackErr);
    }
  }
}

function handleStream(stream) {
  currentStream = stream;
  video.srcObject = stream;

  video.addEventListener("loadedmetadata", () => {
    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;
    requestAnimationFrame(drawLoop);
  });
}

// Draw boxes on overlay canvas
function drawLoop() {
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  boxes.forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;
    ctx.rect(x1, y1, x2 - x1, y2 - y1);
    ctx.stroke();
  });

  const now = Date.now();
  if (now - lastDetectionTime > 1000) {
    lastDetectionTime = now;
    detectFrame();
  }

  requestAnimationFrame(drawLoop);
}

// Send frame for YOLO detection
function detectFrame() {
  const tempCanvas = document.createElement("canvas");
  const tempCtx = tempCanvas.getContext("2d");
  tempCanvas.width = video.videoWidth;
  tempCanvas.height = video.videoHeight;
  tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

  tempCanvas.toBlob(async (blob) => {
    const formData = new FormData();
    formData.append("frame", blob);

    try {
      const res = await fetch("/detect", { method: "POST", body: formData });
      const data = await res.json();
      boxes = data.boxes || [];
      currentDetections = boxes;
    } catch (err) {
      console.error("Detection error:", err);
    }
  }, "image/jpeg");
}

// Handle canvas click to go to chat
overlay.addEventListener("click", async (e) => {
  const rect = overlay.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (overlay.width / rect.width);
  const y = (e.clientY - rect.top) * (overlay.height / rect.height);

  const clicked = currentDetections.filter(([x1, y1, x2, y2]) =>
    x >= x1 && x <= x2 && y >= y1 && y <= y2
  );

  if (clicked.length === 0) return;

  clicked.sort((a, b) => (a[2] - a[0]) * (a[3] - a[1]) - (b[2] - b[0]) * (b[3] - b[1]));
  const [x1, y1, x2, y2] = clicked[0];

  try {
    const res = await fetch("/crop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        x1, y1, x2, y2,
        sessioncode: sessionCode,
        marker_id: "marker-5"
      })
    });

    const data = await res.json();
    sessionStorage.setItem("initialMessage", data.gpt_reply);
    sessionStorage.setItem("objectLabel", data.label);
    sessionStorage.setItem("sessionId", data.session_id);
    window.location.href = "chat.html";
  } catch (err) {
    console.error("Crop failed:", err);
    alert("Error processing object. Try again.");
  }
});

document.getElementById("switchBtn")?.addEventListener("click", () => {
  usingFront = !usingFront;
  startCamera(usingFront ? "user" : "environment");
});

startCamera("environment");
