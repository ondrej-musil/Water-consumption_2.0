/* - - Variables - - */
let frequency = document.getElementById("frequency-slider");
let frequencyLabel = document.querySelector("label[for='frequency-slider']");

// Import Matter.js components
const { Engine, Bodies, Composite, Body } = Matter;

// Matter.js engine
let engine;

// Our boxes (Matter.js physics bodies)
var boxes = [];
let boxSize = 50;
let circleSize = 10;

// Timer variables for controlling circle frequency
let lastCircleTime = 0;

// Source images
let img;
let faucetImg;

// Variables for pixel grid on the left canvas
let pixelSize = 40; // Size of the "pixels"

// Pause functionality
let isPaused = false; // Flag to track the paused state

// Gravity toggle functionality
let isGravityInverted = false; // Flag to track gravity direction

// Data from CSV
let consumptionData = [];

/* - - Preload - - */
function preload() {
  img = loadImage("2water.png"); // Load the source image
  faucetImg = loadImage("faucet_2.png"); // Load the faucet image

  // Load and parse the CSV file
  loadTable(
    "spotreba.csv",
    "csv",
    "header",
    function (table) {
      consumptionData = table.getRows().map((row) => ({
        year: parseInt(row.get("Rok")),
        consumption: parseFloat(row.get("Spotřeba domácností (litry/osoba/den)")),
      }));
    },
    function () {
      console.error("Failed to load CSV data.");
    }
  );
}

/* - - Setup - - */
function setup() {
  // Create canvas inside div
  let canvas = createCanvas(1000, 1000);
  canvas.parent("canvas");

  background("black");

  // Create the physics engine
  engine = Engine.create();
  engine.gravity.x = 0;
  engine.gravity.y = 1; // Apply gravity downwards

  let walls = [
    Bodies.rectangle(width / 2, 0, width, 10, { isStatic: true }),
    Bodies.rectangle(width / 2, height, width, 10, {
      isStatic: true,
    }),
    Bodies.rectangle(0, height / 2, 10, height, { isStatic: true }),
    Bodies.rectangle(width, height / 2, 10, height, {
      isStatic: true,
    }),
  ];
  Composite.add(engine.world, walls);

  // Update the frequency slider label with the year
  updateFrequencyLabel();

  // Add pause functionality to the button
  document.getElementById("pause-button").addEventListener("click", () => {
    togglePause(); // Call the pause function
    const pauseState = isPaused ? "Simulace je pozastavena." : "Simulace běží.";
    updateInfoBox(pauseState); // Update info box text
  });

  // Initialize the information box with a default message
  updateInfoBox("Čekání na data...");
}

function draw() {
  if (!isPaused) {
    background(0);

    drawPixelGrid();

    Engine.update(engine); // Update the Matter.js engine

    // Remove circles after 6 seconds
    for (let i = boxes.length - 1; i >= 0; i--) {
      let circle = boxes[i];
      if (millis() - circle.creationTime > 4000) {
        // 6000 milliseconds = 6 seconds
        Composite.remove(engine.world, circle); // Remove from Matter.js world
        boxes.splice(i, 1); // Remove from the boxes array
      }
    }

    let year = getYearFromSlider();
    let interval = map(year, 1989, 2021, 200, 1000); // Inverted relationship

    if (millis() - lastCircleTime > interval) {
      addCircle();
      lastCircleTime = millis();
    }

    drawFaucetImage();

    // Update the information box with data for the current year
    updateInfoBoxForYear(year);
  }
}


// Function to toggle pause state
function togglePause() {
  isPaused = !isPaused; // Toggle pause state
  if (isPaused) {
    noLoop(); // Stop the p5.js draw loop
    document.getElementById("pause-button").innerText = "Resume";
  } else {
    loop(); // Resume the p5.js draw loop
    document.getElementById("pause-button").innerText = "Pause";
  }
}

// Function to invert gravity
function invertGravity() {
  isGravityInverted = !isGravityInverted; // Toggle gravity direction
  engine.gravity.y = isGravityInverted ? -1 : 1; // Invert gravity
  const gravityState = engine.gravity.y === 1 ? "Gravitace: Dolů" : "Gravitace: Nahoru";
  updateInfoBox(gravityState); // Update info box text
}

// Function to update the information box
function updateInfoBox(message) {
  const infoText = document.getElementById("info-text");
  infoText.innerText = message;
}

// Function to update the information box with data for a specific year
function updateInfoBoxForYear(year) {
  const dataForYear = consumptionData.find((row) => row.year === year);
  if (dataForYear) {
    updateInfoBox(
      `Rok: ${dataForYear.year}\nSpotřeba: ${dataForYear.consumption.toFixed(2)} litrů na osobu denně`
    );
  } else {
    updateInfoBox("Data nejsou dostupná pro vybraný rok.");
  }
}

// Add keyboard event listener for 'P' and 'G' keys
function keyPressed() {
  if (key === 'p' || key === 'P') {
    togglePause(); // Call the togglePause function
    const pauseState = isPaused ? "Simulace je pozastavena." : "Simulace běží.";
    updateInfoBox(pauseState); // Update info box text
  }

  if (key === 'g' || key === 'G') {
    invertGravity(); // Call the invertGravity function
  }
}

// This function will draw the pixel grid on the left canvas
function drawPixelGrid() {
  for (let x = 0; x < width; x += pixelSize) {
    for (let y = 0; y < height; y += pixelSize) {
      let colorSum = color(0, 0, 0);
      let sizeMod = 0;

      for (let i = 0; i < boxes.length; i++) {
        let circle = boxes[i].position;
        let dx = x - circle.x;
        let dy = y - circle.y;
        let distance = dist(x, y, circle.x, circle.y);

        let imgColor = img.get(
          (x + circle.x) % img.width,
          (y + circle.y) % img.height
        );
        let influence = map(distance, 0, 200, 1, 0, true);

        let r = red(imgColor) * influence;
        let g = green(imgColor) * influence;
        let b = blue(imgColor) * influence;

        colorSum = color(
          red(colorSum) + r,
          green(colorSum) + g,
          blue(colorSum) + b
        );

        sizeMod += map(distance, 0, 100, 1.5, 0.5, true);
      }

      sizeMod = constrain(sizeMod, 0.5, 1.5);
      fill(colorSum);
      let size = pixelSize * sizeMod;
      rect(x, y, size, size);
    }
  }

  fill(0, 0, 200);
  noStroke();
  rect(width / 2 - 25, 100, 50, 100);
}

// This function will create a circle and add it to the world
function addCircle() {
  let x = width / 2;
  let y = 200;
  let size = random(10, 30);

  let newCircle = Bodies.circle(x, y, size, {
    restitution: 0.8,
    friction: 0.01,
    frictionAir: 0.01,
    isStatic: false,
  });

  newCircle.creationTime = millis();

  boxes.push(newCircle);
  Composite.add(engine.world, newCircle);

  Body.applyForce(
    newCircle,
    { x: x, y: y },
    { x: random(-0.02, 0.02), y: random(-0.02, 0.02) }
  );
}

// Update the frequency slider label to display the year
function updateFrequencyLabel() {
  let year = getYearFromSlider();
  frequencyLabel.innerHTML = `${year}`;
}

// Event listener to update the year when slider value changes
frequency.addEventListener("input", updateFrequencyLabel);

// Helper function to get the year value from the slider
function getYearFromSlider() {
  return Math.round(map(frequency.value, frequency.min, frequency.max, 1989, 2020));
}

// Function to draw the faucet image on top of everything
function drawFaucetImage() {
  let faucetX = -100;
  let faucetY = 20;
  image(faucetImg, faucetX, faucetY, faucetImg.width + 400, faucetImg.height + 400);
}


