import { createImageAnnotator } from "@annotorious/annotorious";
import "@annotorious/annotorious/annotorious.css";
import JSZip from "jszip";

// DOM variables
const imageInput = document.getElementById("image-input");
const image = document.getElementById("floor-plan");
const newSpaceForm = document.getElementById("new-space-form");
const newSpaceFormCloseButton = document.getElementById("new-space-close-btn");
const updateSpaceForm = document.getElementById("update-space-form");
const updateSpaceFormCloseButton = document.getElementById(
  "update-space-close-btn",
);
const updateSpaceFormDeleteButton = document.getElementById(
  "update-space-delete-btn",
);
const updateSpaceFormSaveButton = document.getElementById(
  "update-space-save-btn",
);
const updateSpaceFormNameInput = document.getElementById("update-space-name");
const updateSpaceFormDescInput = document.getElementById("update-space-desc");
const updateSpaceFormFilesInput = document.getElementById("update-space-files");
const newSpaceFormSaveButton = document.getElementById("new-space-save-btn");
const projectName = document.getElementById("dir-name");
const submitProject = document.getElementById("submit-floor-plan");

// Utility Variables
const anno = createImageAnnotator(image); // Create Annotorious instance
let floorSpaces = []; // List of floorSpace objects
let annotationID = 0; // This is the temp variable for the annotations unique id upon creation
let annotationCoordinates = { minX: 0, minY: 0, maxX: 0, maxY: 0 }; // This is the temp object containig the bounds of the annotation upon creation
let currentAnnotation = 0; // Temporary variable for storing current annotation ID upon updating
let currentCoordinates = 0; // Temporary vraiable for storing current annotation coordinates upon updating
let newCoordinates = { minX: 0, minY: 0, maxX: 0, maxY: 0 }; // This is a temp object for storing the new coordinates of the floor space
// Image map order (minX,minY,maxX,maxY)
let imageName = "";
let offsetX,
  offsetY,
  isDragging = false;

// Event listeners
imageInput.addEventListener("change", function (event) {
  const file = event.target.files[0];

  if (file) {
    const reader = new FileReader();

    reader.onload = function (e) {
      console.log(e);
      image.alt = `Floor Plan: ${file.name}`;
      image.src = e.target.result;
      imageName = file.name;
    };

    reader.readAsDataURL(file);
  }
});

window.addEventListener("DOMContentLoaded", () => {
  if (!image) {
    console.error("Image not found!");
    return;
  }

  // Creates the annotation
  anno.on("createAnnotation", (a) => {
    // When users creates annotation saves the ID and coordinates for later use
    newSpaceForm.hidden = false;
    annotationID = a.id;
    annotationCoordinates.maxX =
      a.target.selector.geometry.bounds.maxX.toFixed(2);
    annotationCoordinates.maxY =
      a.target.selector.geometry.bounds.maxY.toFixed(2);
    annotationCoordinates.minX =
      a.target.selector.geometry.bounds.minX.toFixed(2);
    annotationCoordinates.minY =
      a.target.selector.geometry.bounds.minY.toFixed(2);
  });

  anno.on("updateAnnotation", (a) => {
    // When user wants to update the annotation, this will auto fill the form with the current annotation
    // Get the current floor space by ID
    currentAnnotation = a.id;
    const currentFloorSpace = findFloorPlan(currentAnnotation);
    // Save the current floor space coordinates in case the change was accidental
    currentCoordinates = currentFloorSpace.coordinates;
    // Get the new coordinates in case of submit
    newCoordinates.maxX = a.target.selector.geometry.bounds.maxX.toFixed(2);
    newCoordinates.maxY = a.target.selector.geometry.bounds.maxY.toFixed(2);
    newCoordinates.minX = a.target.selector.geometry.bounds.minX.toFixed(2);
    newCoordinates.minY = a.target.selector.geometry.bounds.minY.toFixed(2);
    // Auto fill the form with the current floor space
    updateSpaceFormDescInput.value = currentFloorSpace.desc;
    updateSpaceFormNameInput.value = currentFloorSpace.name;
    // Add the files to the form
    if (currentFloorSpace.files.length === 0) {
      updateSpaceFormFilesInput.files = "";
    } else {
      const dataTransfer = new DataTransfer(); // Object used to move files
      currentFloorSpace.files.forEach((file) => {
        dataTransfer.items.add(file);
      });
      console.log(dataTransfer.files);
      updateSpaceFormFilesInput.files = dataTransfer.files;
    }
    updateSpaceForm.hidden = false;
  });
});

// Hides the new space form popup
newSpaceFormCloseButton.addEventListener("click", () => {
  console.log("Close new space popup");
  newSpaceForm.hidden = true;
});

// Hides the update space form popup
updateSpaceFormCloseButton.addEventListener("click", () => {
  console.log("Close update space popup");
  updateSpaceForm.hidden = true;
});

updateSpaceFormDeleteButton.addEventListener("click", async () => {
  // This button will remove the annotation from the list and hide the update-space-form
  console.log("Deleting annotation from annotaitons");
  console.log("Pre-delete: ", floorSpaces.length);
  const floorPlan = findFloorPlan(currentAnnotation);
  console.log(floorPlan);
  anno.removeAnnotation(floorPlan.id);
  floorSpaces.pop(floorPlan);
  updateSpaceForm.hidden = true;
  console.log("Post-delete", floorSpaces.length);
});

updateSpaceFormSaveButton.addEventListener("click", async () => {
  // This button will update any changes made to the annotation object
  // Remove first before updating
  const floorPlan = findFloorPlan(currentAnnotation);
  const index = floorSpaces.findIndex((f) => f.id === currentAnnotation);
  if (index !== -1) {
    floorSpaces[index] = {
      ...floorSpaces[index],
      name: data.get("name"),
      desc: data.get("desc"),
      files: data.getAll("files"),
      coordinates: coordinatesAreEqual(newCoordinates, currentCoordinates)
        ? currentCoordinates
        : newCoordinates,
    };
  }
  updateSpaceForm.hidden = true;
  console.log("Updated Floor space", floorSpaces);
});

newSpaceFormSaveButton.addEventListener("click", async () => {
  // This button will push the floorSpace object to the list and hide the newSpace Form
  const data = new FormData(newSpaceForm);
  const floorSpace = {
    // Object designed to hold data regarding all spaces on a given floor
    id: annotationID, // ID of the mapping (this is found from the annotation object)
    name: data.get("name"), // The name of the floor space
    desc: data.get("desc"), // Any relevant text regarding the floor space
    files: data.getAll("files"), // This is going to be a list file paths that points to an assets folder in the output
    coordinates: annotationCoordinates, // Also found with the annotation object, used to help create the image map element
    geometry: "rect", // The type of shape the annotation takes (Rectangle, Polygon, etc...)
  };
  floorSpaces.push(floorSpace);
  newSpaceForm.hidden = true;
  console.log("New floor spce created: ", floorSpaces);
});

// Start dragging on mousedown
newSpaceForm.addEventListener("mousedown", (event) => {
  isDragging = true;
  offsetX = event.clientX - newSpaceForm.getBoundingClientRect().left;
  offsetY = event.clientY - newSpaceForm.getBoundingClientRect().top;
  newSpaceForm.style.cursor = "grabbing";
});

document.addEventListener("mousemove", (event) => {
  if (isDragging) {
    newSpaceForm.style.left = event.clientX - offsetX + "px";
    newSpaceForm.style.top = event.clientY - offsetY + "px";
  }
});

document.addEventListener("mouseup", () => {
  isDragging = false;
  newSpaceForm.style.cursor = "grab";
});

updateSpaceForm.addEventListener("mousedown", (event) => {
  isDragging = true;
  offsetX = event.clientX - updateSpaceForm.getBoundingClientRect().left;
  offsetY = event.clientY - updateSpaceForm.getBoundingClientRect().top;
  updateSpaceForm.style.cursor = "grabbing";
});

document.addEventListener("mousemove", (event) => {
  if (isDragging) {
    updateSpaceForm.style.left = event.clientX - offsetX + "px";
    updateSpaceForm.style.top = event.clientY - offsetY + "px";
  }
});

document.addEventListener("mouseup", () => {
  isDragging = false;
  updateSpaceForm.style.cursor = "grab";
});

// Functions

function createDirectories() {
  // Creates the necessary folders to write to
  const folderName = projectName.value;
  const assets = `./${folderName}/assets`;

  // Create directories if they don't exist
  for (const dir of [folderName, assets]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created: ${dir}`);
    }
  }
}

submitProject.addEventListener("click", async () => {
  console.log("Submit Clicked!");

  // Generate project files and zip
  const zipBlob = await createAndZipProject();

  // Trigger download
  downloadProjectFolder(zipBlob, `${projectName.value}.zip`);
});

async function createAndZipProject() {
  const zip = new JSZip();
  const folderName = projectName.value.trim();
  const assetsFolder = zip.folder(`${folderName}/assets`);

  // Build index.html content
  let content = `
<!DOCTYPE html>
<html>
<head>
  <title>${folderName}</title>
  <style>
    /* General Reset */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Arial', sans-serif;
      line-height: 1.6;
      background-color: #f4f4f9;
      color: #333;
      padding: 20px;
    }

    h1 {
      font-size: 24px;
      margin-bottom: 20px;
      color: #333;
    }

    /* Image container to center */
    .image-container {
      display: flex;
      justify-content: center;
      margin-bottom: 20px;
    }

    /* Image Styling */
    img {
      width: 80%; /* make bigger than default */
      max-width: 1200px; /* don't exceed this size */
      height: auto;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      display: block;
    }

    /* Floor map interaction areas */
    area {
      outline: none;
    }

    /* Output Area */
    #output {
      margin-top: 20px;
      font-size: 18px;
      color: #333;
      padding: 10px;
      background-color: #fff;
      border: 1px solid #ddd;
      border-radius: 4px;
    }

    /* Form Styling */
    form {
      background-color: #fff;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
      max-width: 400px;
      margin: 30px auto; /* center form horizontally */
      position: relative;
      transition: opacity 0.3s ease-in-out;
    }

    form.hidden {
      display: none;
    }

    label {
      display: block;
      font-size: 16px;
      margin-bottom: 8px;
      color: #555;
    }

    input[type="text"], textarea {
      width: 100%;
      padding: 10px;
      margin-bottom: 20px;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 14px;
      background-color: #f9f9f9;
    }

    input[type="text"]:focus, textarea:focus {
      border-color: #007bff;
      outline: none;
    }

    button[type="button"] {
      background-color: #ff4d4f;
      color: white;
      border: none;
      padding: 8px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      position: absolute;
      top: 10px;
      right: 10px;
    }

    button[type="button"]:hover {
      background-color: #d93638;
    }

    #misc-files {
      margin-top: 10px;
    }

    /* iframe Styling */
    iframe {
      border: none;
      border-radius: 8px;
      margin-top: 15px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      form {
        width: 90%;
      }

      img {
        width: 100%; /* scale down on small screens */
      }

      iframe {
        height: 300px;
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="image-container">
    <img src="./assets/${imageName}" alt="Floor Plan" usemap="#floormap">
  </div>
  <map name="floormap">
    ${floorSpaces
      .map(
        (fs) =>
          `<area alt="${fs.name}" title="${fs.name}" coords="${fs.coordinates.minX},${fs.coordinates.minY},${fs.coordinates.maxX},${fs.coordinates.maxY}" shape="${fs.geometry}" data-id="${fs.id}">`,
      )
      .join("\n")}
  </map>

  <form id="floor-space-form" hidden>
    <button type="button" id="close-form">X</button>
    <label for="space-name">Name of Floor Space:</label>
    <input type="text" id="space-name" name="space-name" />
    <label for="space-desc">Description:</label>
    <textarea id="space-desc" name="space-desc"></textarea>
    <label for="space-files">Files:</label>
    <div id="misc-files"></div>
  </form>

  <script>
    const form = document.getElementById('floor-space-form');
    const nameField = document.getElementById('space-name');
    const desc = document.getElementById('space-desc');
    const areas = document.querySelectorAll('area');
    const miscFiles = document.getElementById('misc-files');

    const floorSpaces = ${JSON.stringify(floorSpaces)};

    document.getElementById('close-form').addEventListener('click', () => form.hidden = true);

    areas.forEach(area => {
      area.addEventListener('click', event => {
        event.preventDefault();
        const fs = floorSpaces.find(f => f.id == area.dataset.id);
        nameField.value = fs.name;
        desc.value = fs.desc;
        form.hidden = false;

        miscFiles.innerHTML = ''; // Clear previous files

        fs.files.forEach(f => {
          if (f.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = f.dataURL;
            img.alt = f.name;
            img.style.maxWidth = '200px';
            miscFiles.appendChild(img);
          } else if (f.type === 'application/pdf') {
            const iframe = document.createElement('iframe');
            iframe.src = f.dataURL;
            iframe.width = '400';
            iframe.height = '300';
            miscFiles.appendChild(iframe);
          }
        });
      });
    });
  </script>
</body>
</html>
`;

  // Add index.html to project folder
  zip.file(`${folderName}/index.html`, content);

  const response = await fetch(image.src);
  const arrayBuffer = await response.arrayBuffer();
  assetsFolder.file(imageName, arrayBuffer);

  const blob = await zip.generateAsync({ type: "blob" });
  return blob;
}

function downloadProjectFolder(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function findFloorPlan(id) {
  // Finds the floor plan by ID
  const currentAnnotation = id;
  console.log(currentAnnotation);
  const currentFloorSpace = floorSpaces.find(
    (floorSpace) => floorSpace.id == currentAnnotation,
  );
  return currentFloorSpace;
}

function coordinatesAreEqual(a, b) {
  // Compares the two cooradinates
  return (
    a.minX === b.minX &&
    a.minY === b.minY &&
    a.maxX === b.maxX &&
    a.maxY === b.maxY
  );
}
