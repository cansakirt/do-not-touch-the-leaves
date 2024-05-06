// 1. Global variables and settings
let leaves = [];
let mousePos;
let hand_results;
let gesture_results;
let p5canvas;
let landmarkPos;
let categoryName;
let score;

const settings = {
  leafCount: 100,
  leafSize: 80,
  leafSpeed: 1,
  influenceRadius: 300,
  isPaused: false,
  drawInfluence: true,
};

// 2. Leaf class
class Leaf {
  constructor(size, speed) {
    this.x = random(width);
    this.y = random(height);
    this.z = random(-50, 50);
    this.size = size;
    this.speed = p5.Vector.random3D().mult(speed);
    this.rotationSpeed = p5.Vector.random3D().mult(0.05);
    this.rotation = p5.Vector.random3D().mult(TWO_PI);
  }

  update() {
    this.x += this.speed.x;
    this.y += this.speed.y;
    this.z += this.speed.z;
    this.rotation.add(this.rotationSpeed);

    // Bounce off the edges
    if (this.x < 0 || this.x > width) this.speed.x *= -1;
    if (this.y < 0 || this.y > height) this.speed.y *= -1;
    if (this.z < -50 || this.z > 50) this.speed.z *= -1;
  }

  display() {
    push();
    translate(this.x, this.y, this.z);
    rotateX(this.rotation.x);
    rotateY(this.rotation.y);
    rotateZ(this.rotation.z);
    fill(76, 245, 80);
    stroke(50);

    // Drawing leaf shape with veins
    beginShape();
    // Leaf tip
    vertex(0, -this.size / 2);
    // Right side
    bezierVertex(this.size / 4, -this.size / 3, this.size / 2, this.size / 4, 0, this.size / 2);
    // Left side
    bezierVertex(-this.size / 2, this.size / 4, -this.size / 4, -this.size / 3, 0, -this.size / 2);
    endShape();

    // Draw veins
    stroke(120, 50, 50); // Darker stroke for veins
    line(0, -this.size / 2, 0, this.size / 2); // Main vein
    line(0, 0, this.size / 4, -this.size / 6); // Right vein
    line(0, 0, -this.size / 4, -this.size / 6); // Left vein
    pop();
  }
}

// 3. Setup and initialization functions
function setup() {
  p5canvas = createCanvas(windowWidth, windowHeight, WEBGL);
  p5canvas.parent("#canvas");
  frameRate(30);
  mousePos = createVector(-300, -300);
  initializeControls();
  createLeaves();

  gotHands = function (results, results_gesture) {
    hand_results = results;
    gesture_results = results_gesture;
    adjustCanvas();
  };

  window.addEventListener("focus", resumeAnimation);
  window.addEventListener("blur", pauseAnimation);
}

function initializeControls() {
  const controls = [
    { id: "#leaf-count-slider", eventType: "input", action: updateLeafCount },
    { id: "#size-slider", eventType: "input", action: updateLeafSize },
    { id: "#speed-slider", eventType: "input", action: updateLeafSpeed },
    { id: "#influence-radius-slider", eventType: "input", action: updateInfluenceRadius },
    { id: "#draw-influence-checkbox", eventType: "change", action: updateDrawInfluence },
    { id: "#grid-button", eventType: "click", action: createGrid },
  ];

  controls.forEach(({ id, eventType, action }) => {
    let element = select(id);
    if (element.elt) {
      element.elt.addEventListener(eventType, (e) => action(e.target.value));
    } else {
      console.error("Failed to find element: " + id);
    }
  });

  select("#leaf-count-value").html(settings.leafCount);
  select("#size-value").html(settings.leafSize);
  select("#speed-value").html(settings.leafSpeed);
  select("#influence-radius-value").html(settings.influenceRadius);
  select("#leaf-count-slider").value(settings.leafCount);
  select("#size-slider").value(settings.leafSize);
  select("#speed-slider").value(settings.leafSpeed);
  select("#influence-radius-slider").value(settings.influenceRadius);
}

// 3. Leaf creation
function createLeaves() {
  leaves = Array.from({ length: settings.leafCount }, () => new Leaf(settings.leafSize, settings.leafSpeed));
}

// 4. Update functions for settings and leaves
function updateLeafCount(value) {
  settings.leafCount = parseInt(value);
  let difference = settings.leafCount - leaves.length;
  if (difference > 0) {
    leaves.push(...Array.from({ length: difference }, () => new Leaf(settings.leafSize, settings.leafSpeed)));
  } else {
    leaves.length = settings.leafCount;
  }
  select("#leaf-count-value").html(settings.leafCount);
}

function updateLeafSize(value) {
  settings.leafSize = parseInt(value);
  leaves.forEach((leaf) => (leaf.size = settings.leafSize));
  select("#size-value").html(settings.leafSize);
}

function updateLeafSpeed(value) {
  settings.leafSpeed = parseFloat(value);
  leaves.forEach((leaf) => leaf.speed.setMag(settings.leafSpeed));
  select("#speed-value").html(settings.leafSpeed);
}

function updateInfluenceRadius(value) {
  console.log("settings.influenceRadius :>> ", settings.influenceRadius);
  settings.influenceRadius = parseInt(value);
  select("#influence-radius-value").html(settings.influenceRadius);
}

function updateDrawInfluence(value) {
  settings.drawInfluence = !!value;
}

// 5. Animation control
function animate() {
  draw();
  requestAnimationFrame(animate);
}

function draw() {
  if (settings.isPaused) return;

  clear();
  translate(-width / 2, -height / 2);
  setupLights();

  if (hand_results?.landmarks?.[0]) {
    processIndexFinger(hand_results.landmarks[0][8]);
    // drawCircle(mousePos.x, mousePos.y, 253, 74, 71);
  }

  if (gesture_results?.gestures?.[0]) {
    handleGestures(gesture_results.gestures[0][0]);
  }

  // Update and display leaves
  leaves.forEach((leaf) => {
    leaf.update();
    leaf.display();
    applyPointForce(leaf);
  });

  if (settings.drawInfluence) {
    drawInfluenceRadius();
  }
}

function setupLights() {
  background("rgba(64, 224, 208, 0.3)");
  directionalLight(20, 200, 20, 0.25, 0.5, -0.5);
  ambientLight(92, 169, 4);
}

function applyPointForce(leaf) {
  // Precompute the leaf position vector once to avoid creating it multiple times
  const leafPos = createVector(leaf.x, leaf.y);

  // Calculate the distance once and use it throughout the function
  const distance = p5.Vector.dist(mousePos, leafPos);

  // Only process if the leaf is within the influence radius
  if (distance < settings.influenceRadius) {
    // Compute the repulsion force vector from the mouse position to the leaf
    let repulseForce = p5.Vector.sub(leafPos, mousePos);
    repulseForce.normalize(); // Normalize the vector to get direction only

    // Calculate the strength of the force (inverse proportion to distance)
    const strength = 1 - distance / settings.influenceRadius;

    // Scale down the multiplier for a more gentle repulsion
    repulseForce.mult(strength * 2); // Reduced from 4 to 2 for gentler effect
    leaf.speed.add(repulseForce);

    // Gradually increase rotation speed as the mouse gets closer
    const rotationStrength = 1 + 9 * strength; // Gradual increase from 1 to 10
    leaf.rotationSpeed.mult(rotationStrength);
  } else {
    // Reset rotation speed when outside the influence zone
    leaf.rotationSpeed = createVector(random(-0.005, 0.005), random(-0.005, 0.005), random(-0.005, 0.005));
  }
}

// 6. Event handling

function handleGestures(gesture) {
  let currentGesture = categoryName;
  categoryName = gesture.categoryName;
  score = gesture.score;
  if (score > 0.65 && currentGesture != categoryName) {
    if (categoryName === "Thumb_Up") {
      createGrid();
    }
    console.log(categoryName, score);
  }
}

function processIndexFinger(indexFinger) {
  let mouseX = (1 - indexFinger.x) * width;
  let mouseY = indexFinger.y * height;
  let mouseZ = (indexFinger.z + 2) * 20 + 100;

  mousePos.set(mouseX, mouseY, mouseZ);
}

// 7. Utility and interaction

function drawInfluenceRadius() {
  noFill();
  stroke(255, 150);
  ellipse(mousePos.x, mousePos.y, settings.influenceRadius);
}

function drawCircle(x, y, r, g, b) {
  noStroke();
  fill(r, g, b);
  circle(x, y, 10);
}

// 8. Event related functions

function resumeAnimation() {
  settings.isPaused = false;
  loop();
}

function pauseAnimation() {
  settings.isPaused = true;
  noLoop();
}

function windowResized() {
  adjustCanvas();
}

function adjustCanvas() {
  var element_webcam = document.getElementById("webcam");
  resizeCanvas(element_webcam.clientWidth, element_webcam.clientHeight);
}

// 9. Grid creation function
function createGrid() {
  // Store current number of leaves
  let currentLeafCount = leaves.length;

  // Clear leaves array temporarily by setting the count to zero
  updateLeafCount(0);

  // Re-create leaves based on the stored current count
  updateLeafCount(currentLeafCount);

  // Calculate the number of rows and columns based on the square root of the total number of leaves
  let gridSize = floor(sqrt(leaves.length));

  // Calculate the spacing between leaves
  let spacing = min(width, height) / gridSize;

  // Index to keep track of which leaf we are placing
  let index = 0;

  // Loop through each row and column of the grid
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      // Calculate the position of the leaf
      let x = (j + 0.5) * spacing;
      let y = (i + 0.5) * spacing;

      // Set the position of the current leaf
      if (index < leaves.length) {
        leaves[index].x = x;
        leaves[index].y = y;
        index++;
      } else {
        break; // Break if all leaves are placed
      }
    }
    if (index >= leaves.length) {
      break; // Break if all leaves are placed
    }
  }
}

// 9. Start the animation
animate();
