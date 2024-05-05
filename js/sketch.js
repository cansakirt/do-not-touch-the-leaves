let leaves = [];
let leafCount;
let leafSize;
let leafSpeed;
let mousePos;
let landmarkPos;
let influenceRadius = 50; // Increased influence radius
let isPaused = false; // Flag to track if animation is paused
let drawInfluence = true; // Flag to track whether to draw influence radius

let hand_results;
let p5canvas;

function setup() {
  p5canvas = createCanvas(windowWidth, windowHeight, WEBGL);
  p5canvas.parent("#canvas");

  frameRate(30);
  mousePos = createVector(0, 0);

  gotHands = function (results) {
    hand_results = results;
    adjustCanvas();
  };

  // Get initial values from sliders
  leafCount = select("#leafCountSlider").value();
  leafSize = select("#sizeSlider").value();
  leafSpeed = select("#speedSlider").value();

  // Create initial leaves
  for (let i = 0; i < leafCount; i++) {
    leaves.push(new Leaf(leafSize, leafSpeed));
  }

  // Event listeners for sliders
  select("#leafCountSlider").input(updateLeafCount);
  select("#sizeSlider").input(updateLeafSize);
  select("#speedSlider").input(updateLeafSpeed);
  select("#influenceRadiusSlider").input(updateInfluenceRadius); // Add listener for influence radius slider
  select("#drawInfluenceCheckbox").changed(updateDrawInfluence);

  // Button event listener
  select("#gridButton").mousePressed(createGrid);

  // Event listeners for window focus
  window.addEventListener("focus", function () {
    isPaused = false;
    loop(); // Resume animation loop
  });

  window.addEventListener("blur", function () {
    isPaused = true;
    noLoop(); // Pause animation loop
  });
}

function draw() {
  if (isPaused) return; // Don't execute draw loop if paused
  clear();

  // Pre-calculate constant values
  const halfWidth = width / 2;
  const halfHeight = height / 2;

  directionalLight(255, 255, 255, 0.25, 0.5, -0.5);
  ambientLight(180);

  translate(-halfWidth, -halfHeight, 0);

  // // Handle all landmarks for all detected hands
  // if (hand_results && hand_results.landmarks) {
  //   for (const landmarks of hand_results.landmarks) {
  //     for (let landmark of landmarks) {
  //       const posX = landmark.x * width;
  //       const posY = landmark.y * height;
  //       // const posZ = landmark.z * 30; // Adjust Z-scale based on your depth perception needs
  //       const posZ = 1; // Adjust Z-scale based on your depth perception needs

  //       // Update influence for each leaf based on the landmark
  //       console.log("(posX, posY, posZ) :>> ", [posX, posY, posZ]);
  //       let landmarkPos = createVector(posX, posY, posZ);
  //       if (landmarkPos) {
  //         for (const leaf of leaves) {
  //           applyHandForce(leaf, landmarkPos);
  //         }
  //       }

  //       // Optionally draw landmarks
  //       noStroke();
  //       fill(100, 150, 210);
  //       circle(posX, posY, 10);
  //     }
  //   }
  // }

  if (hand_results && hand_results.landmarks[0]) {
    const indexFinger = hand_results.landmarks[0][8];
    const mouseX = (1 - indexFinger.x) * width; // flipped because webcam is flipped.
    const mouseY = indexFinger.y * height;
    const mouseZ = indexFinger.z * 30;

    mousePos = createVector(mouseX, mouseY, mouseZ);

    noStroke();
    // fill(100, 150, 210);
    fill(253, 74, 71);
    circle(mouseX, mouseY, 10);

    // Draw influence radius around mouse if enabled
    if (drawInfluence) {
      noFill();
      stroke(255, 150);
      ellipse(mouseX, mouseY, mouseZ * influenceRadius * 2);
    }
  }

  // Update and display leaves
  for (const leaf of leaves) {
    leaf.update();
    leaf.display();
    applyMouseForce(leaf);
  }

  if (hand_results) {
    if (hand_results.landmarks) {
      for (const landmarks of hand_results.landmarks) {
        for (let landmark of landmarks) {
          noStroke();
          fill(100, 150, 210);
          circle((1 - landmark.x) * width, landmark.y * height, 10);
        }
      }
    }
  }
}

function windowResized() {
  adjustCanvas();
}

function adjustCanvas() {
  // Get an element by its ID
  var element_webcam = document.getElementById("webcam");
  resizeCanvas(element_webcam.clientWidth, element_webcam.clientHeight);
  //console.log(element_webcam.clientWidth);
}

class Leaf {
  constructor(size, speed) {
    this.x = random(width);
    this.y = random(height);
    this.z = random(-50, 50);
    this.size = size;
    this.speed = createVector(random(-speed, speed), random(-speed, speed), random(-speed, speed));
    this.rotationSpeed = createVector(random(-0.05, 0.05), random(-0.05, 0.05), random(-0.05, 0.05));
    this.rotation = createVector(random(TWO_PI), random(TWO_PI), random(TWO_PI));
  }

  update() {
    this.x += this.speed.x;
    this.y += this.speed.y;
    this.z += this.speed.z;
    this.rotation.add(this.rotationSpeed);

    // Bounce off the edges
    if (this.x < 0 || this.x > width) this.speed.x *= -1;
    if (this.y < 0 || this.y > height) this.speed.y *= -1;
    if (this.z < -500 || this.z > 500) this.speed.z *= -1;
  }

  display() {
    push();
    translate(this.x, this.y, this.z);
    rotateX(this.rotation.x);
    rotateY(this.rotation.y);
    rotateZ(this.rotation.z);
    // fill("#FFC0CB");
    fill("#c0ffc0");
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

function updateInfluenceRadius() {
  influenceRadius = select("#influenceRadiusSlider").value();
}

function updateLeafCount() {
  let newCount = select("#leafCountSlider").value();
  let currentCount = leaves.length;

  if (newCount > currentCount) {
    for (let i = currentCount; i < newCount; i++) {
      leaves.push(new Leaf(leafSize, leafSpeed));
    }
  } else if (newCount < currentCount) {
    leaves.splice(newCount, currentCount - newCount);
  }
  // Update leaf count value display
  select("#leafCountValue").html(newCount);
}

function updateLeafSize() {
  leafSize = select("#sizeSlider").value();
  for (let leaf of leaves) {
    leaf.size = leafSize;
  }
  // Update size value display
  select("#sizeValue").html(leafSize);
}

function updateLeafSpeed() {
  leafSpeed = select("#speedSlider").value();
  for (let leaf of leaves) {
    leaf.speed.setMag(leafSpeed); // Update speed while maintaining direction
  }
  // Update speed value display
  select("#speedValue").html(leafSpeed);
}

function updateDrawInfluence() {
  drawInfluence = this.checked();
}

function applyMouseForce(leaf) {
  let distance = p5.Vector.dist(mousePos, createVector(leaf.x, leaf.y));
  // document.getElementById("mouseDistance").innerHTML = "Distance: " + distance

  if (distance < influenceRadius) {
    // Increase rotation speed for dizziness
    leaf.rotationSpeed.mult(10);

    // Calculate repulsive force direction
    let repulseForce = p5.Vector.sub(createVector(leaf.x, leaf.y), mousePos);
    repulseForce.normalize();

    // Apply force based on distance (closer = stronger force)
    let strength = 1 - distance / influenceRadius; // Inverse relationship
    repulseForce.mult(strength * 4);
    leaf.speed.add(repulseForce);
  } else {
    // Reset rotation speed when outside influence zone
    leaf.rotationSpeed = createVector(random(-0.05, 0.05), random(-0.05, 0.05), random(-0.05, 0.05));
  }
}

// function applyMouseForce(leaf) {
//   const leafPos = createVector(leaf.x, leaf.y); // Store leaf position in a vector
//   const distance = mousePos.dist(leafPos); // Use dist() method for distance calculation

//   if (distance < influenceRadius) {
//     leaf.rotationSpeed.mult(10);

//     // Optimized force calculation
//     const repulseForce = p5.Vector.sub(leafPos, mousePos);
//     repulseForce.normalize().mult((1 - distance / influenceRadius) * 4);
//     leaf.speed.add(repulseForce);
//   } else {
//     leaf.rotationSpeed.set(random(-0.05, 0.05), random(-0.05, 0.05), random(-0.05, 0.05));
//   }
// }

function applyHandForce(leaf, landmarkPos) {
  console.log("leaf, landmarkPos :>> ", leaf, landmarkPos);
  const leafPos = createVector(leaf.x, leaf.y, leaf.z);
  const distance = landmarkPos.dist(leafPos);
  if (distance < influenceRadius) {
    leaf.rotationSpeed.mult(10);

    // Calculate the repulsion force direction
    const repulseForce = p5.Vector.sub(leafPos, landmarkPos)
      .normalize()
      .mult((1 - distance / influenceRadius) * 4);
    leaf.speed.add(repulseForce);
  } else {
    // Reset rotation speed when outside the influence zone
    leaf.rotationSpeed.set(random(-0.05, 0.05), random(-0.05, 0.05), random(-0.05, 0.05));
  }
}

function createGrid() {
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
