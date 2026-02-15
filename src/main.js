import { createImageAnnotator } from "@annotorious/annotorious";
import "@annotorious/annotorious/annotorious.css";
import JSZip from "jszip";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

// =============================================================================
// DOM ELEMENT REFERENCES
// =============================================================================

const imageInput = document.getElementById("image-input");
const image = document.getElementById("floor-plan");
const newSpaceForm = document.getElementById("new-space-form");
const newSpaceFormCloseButton = document.getElementById("new-space-close-btn");
const newSpaceFormTitle = document.getElementById("new-space-name");
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
const plusBtn = document.getElementById("plus-btn");
const minusBtn = document.getElementById("minus-btn");
const btnContainer = document.getElementById("btn-container");
// =============================================================================
// STATE VARIABLES
// =============================================================================

// Annotorious instance for image annotation
const anno = createImageAnnotator(image);

// Array to store all floor space annotations
let floorSpaces = new Map();

// Current annotation being created/edited
let annotationID = 0;
let annotationCoordinates = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
let currentAnnotation = 0;
let currentCoordinates = 0;
let newCoordinates = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

// Image data
let imageName = "";
let imageDataURL = "";
let imageNaturalWidth = 0;
let imageNaturalHeight = 0;

// Form dragging state
let offsetX = 0;
let offsetY = 0;
let isDragging = false;

// Device detection
let deviceType = "";

// Array of Images
let images = [];
// Image Navigation
let count = 0;

// =============================================================================
// ANNOTORIOUS SETUP
// =============================================================================

window.addEventListener("DOMContentLoaded", () => {
  if (!image) {
    console.error("Image element not found!");
    return;
  }

  // Event handler when a new annotation is created
  anno.on("createAnnotation", (annotation) => {
    newSpaceForm.hidden = false;
    annotationID = annotation.id;

    // Store the coordinates from the annotation
    const bounds = annotation.target.selector.geometry.bounds;
    annotationCoordinates.maxX = parseFloat(bounds.maxX.toFixed(2));
    annotationCoordinates.maxY = parseFloat(bounds.maxY.toFixed(2));
    annotationCoordinates.minX = parseFloat(bounds.minX.toFixed(2));
    annotationCoordinates.minY = parseFloat(bounds.minY.toFixed(2));
  });

  // Event handler when an existing annotation is updated
  anno.on("updateAnnotation", (annotation) => {
    currentAnnotation = annotation.id;
    // const currentFloorSpace = findFloorPlan(currentAnnotation);
    const currentImage = getCurrentImageName();
    const currentFloorSpace = floorSpaces.get(currentImage);

    currentCoordinates = currentFloorSpace.coordinates;

    // Store new coordinates
    const bounds = annotation.target.selector.geometry.bounds;
    newCoordinates.maxX = parseFloat(bounds.maxX.toFixed(2));
    newCoordinates.maxY = parseFloat(bounds.maxY.toFixed(2));
    newCoordinates.minX = parseFloat(bounds.minX.toFixed(2));
    newCoordinates.minY = parseFloat(bounds.minY.toFixed(2));

    // Populate the update form with existing data
    updateSpaceFormDescInput.value = currentFloorSpace.desc;
    updateSpaceFormNameInput.value = currentFloorSpace.name;

    // Restore file list if files exist
    if (currentFloorSpace.files.length === 0) {
      updateSpaceFormFilesInput.files = "";
    } else {
      const dataTransfer = new DataTransfer();
      currentFloorSpace.files.forEach((file) => dataTransfer.items.add(file));
      updateSpaceFormFilesInput.files = dataTransfer.files;
    }

    updateSpaceForm.hidden = false;
  });
});

// =============================================================================
// EVENT LISTENERS
// =============================================================================

// Detect device type on page load
window.addEventListener("load", () => {
  deviceType = detectDeviceType();
});

// Close new space form
newSpaceFormCloseButton.addEventListener("click", (event) => {
  event.preventDefault();

  newSpaceForm.hidden = true;
});

// Close update space form
updateSpaceFormCloseButton.addEventListener("click", (event) => {
  event.preventDefault();

  updateSpaceForm.hidden = true;
});

// Delete a floor space annotation
updateSpaceFormDeleteButton.addEventListener("click", async (event) => {
  event.preventDefault();

  const floorPlan = findFloorPlan(currentAnnotation);
  anno.removeAnnotation(floorPlan.id);
  floorSpaces = floorSpaces.filter((fs) => fs.id !== floorPlan.id);
  updateSpaceForm.hidden = true;
});

// Save updates to an existing floor space
updateSpaceFormSaveButton.addEventListener("click", async (event) => {
  event.preventDefault();

  if (!updateSpaceFormNameInput.value.trim()) {
    alert("Please enter a title!");
  }

  const data = new FormData(updateSpaceForm);
  //const index = floorSpaces.findIndex((f) => f.id === currentAnnotation);
  const files = data.getAll("files");
  const currentFloorSpace = getCurrentImageName();

  const floorSpace = {
    id: annotationID,
    name: data.get("name"),
    desc: data.get("desc"),
    files,
    coordinates: coordinatesAreEqual(newCoordinates, currentCoordinates)
      ? currentCoordinates
      : newCoordinates,
    geometry: "rect",
    fileNames: files.map((f) => f.name),
    color: data.get("color"),
  };

  floorSpaces.set(currentFloorSpace, floorSpace);
  console.log(floorSpaces);

  updateSpaceForm.hidden = true;
});

// Save a new floor space annotation
newSpaceFormSaveButton.addEventListener("click", async (event) => {
  event.preventDefault();

  if (!newSpaceFormTitle.value.trim()) {
    alert("Please enter a title!");
  }

  const data = new FormData(newSpaceForm);
  const files = data.getAll("files");
  const imageName = getCurrentImageName();

  const floorSpace = {
    id: annotationID,
    name: data.get("name"),
    desc: data.get("desc"),
    files,
    coordinates: annotationCoordinates,
    geometry: "rect",
    fileNames: files.map((f) => f.name),
    color: data.get("color"),
  };

  // Reset coordinates for next annotation
  annotationCoordinates = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  floorSpaces.set(imageName, floorSpace);
  console.log(floorSpaces);
  newSpaceForm.hidden = true;
});

// =============================================================================
// FORM DRAGGING - NEW SPACE FORM
// =============================================================================

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
  if (isDragging) {
    isDragging = false;
    newSpaceForm.style.cursor = "grab";
  }
});

// =============================================================================
// FORM DRAGGING - UPDATE SPACE FORM
// =============================================================================

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
  if (isDragging) {
    isDragging = false;
    updateSpaceForm.style.cursor = "grab";
  }
});

// =============================================================================
// IMAGE UPLOAD HANDLER
// =============================================================================

imageInput.addEventListener("change", function (event) {
  // const file = event.target.files[0];

  // if (file) {
  //   const reader = new FileReader();

  //   reader.onload = function (e) {
  //     image.alt = `Floor Plan: ${file.name}`;
  //     image.src = e.target.result;
  //     imageDataURL = e.target.result;
  //     imageName = file.name;

  //     // Store natural dimensions once image loads
  //     image.onload = () => {
  //       imageNaturalWidth = image.naturalWidth;
  //       imageNaturalHeight = image.naturalHeight;
  //     };
  //   };

  //   reader.readAsDataURL(file);
  // }
  images = [...event.target.files]; // convert FileList to array
  count = 0;

  if (images.length > 1) {
    btnContainer.hidden = false;
  } else {
    btnContainer.hidden = true;
  }

  showImage();
});

// =============================================================================
// PROJECT SUBMISSION
// =============================================================================

submitProject.addEventListener("click", async (event) => {
  event.preventDefault();

  const zipBlob = await createAndZipProject();

  if (!projectName) {
    alert("Please Enter a project name");
  }

  if (deviceType === "Mobile") {
    // Convert to base64 for mobile sharing
    const base64 = await blobToBase64(zipBlob);
    downloadMobileProjectFolder(base64);
  } else {
    // Direct download for desktop
    downloadProjectFolder(zipBlob, `${projectName.value.trim()}.zip`);
  }
});

// =============================================================================
// IMAGE LIST NAVIGATION
// =============================================================================

plusBtn.addEventListener("click", () => {
  if (count < images.length - 1) {
    count++;
    showImage();
  }
});

minusBtn.addEventListener("click", () => {
  if (count > 0) {
    count--;
    showImage();
  }
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Creates a ZIP file containing the floor plan project with HTML viewer
 * @returns {Promise<Blob>} ZIP file as a Blob
 */
async function createAndZipProject() {
  const zip = new JSZip();
  const folderName = projectName.value.trim();
  const assetsFolder = zip.folder(`${folderName}/assets`);

  // Add the floor plan image to assets
  const imageBlob = dataURLToBlob(imageDataURL);
  assetsFolder.file(imageName, imageBlob);

  // Add all uploaded files to assets
  floorSpaces.forEach((fs) => {
    fs.files.forEach((file) => {
      assetsFolder.file(`${fs.id}-${file.name}`, file);
    });
  });

  // Generate the HTML content for the interactive floor plan viewer
  const htmlContent = generateHTMLContent(folderName);
  zip.file(`${folderName}/index.html`, htmlContent);

  return await zip.generateAsync({ type: "blob" });
}

/**
 * Generates the HTML content for the floor plan viewer
 * @param {string} folderName - Name of the project folder
 * @returns {string} Complete HTML document as string
 */
function generateHTMLContent(folderName) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${folderName}</title>
  <style>
    /* General Reset */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica', 'Arial', sans-serif;
      line-height: 1.6;
      background-color: #fafafa;
      color: #1a1a1a;
      padding: 20px;
    }

    /* Header */
    .header {
      text-align: center;
      margin-bottom: 40px;
    }

    .header h1 {
      font-size: 28px;
      font-weight: 500;
      color: #1a1a1a;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }

    .header p {
      color: #666;
      font-size: 14px;
      font-weight: 400;
    }

    /* File input styling */
    .file-input-wrapper {
      text-align: center;
      margin-bottom: 30px;
    }

    .file-input-wrapper label {
      display: inline-block;
      padding: 10px 20px;
      background: white;
      color: #1a1a1a;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 400;
      transition: all 0.2s ease;
    }

    .file-input-wrapper label:hover {
      border-color: #1a1a1a;
      background: #fafafa;
    }

    .file-input-wrapper input[type="file"] {
      display: none;
    }

    /* Main container */
    .main-container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
    }

    /* Image container */
    .image-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 40px;
      background: white;
      position: relative;
    }

    /* Wrapper for image and overlays */
    .image-wrapper {
      position: relative;
      display: inline-block;
      max-width: 100%;
    }

    /* Floor plan image */
    #floor-plan {
      max-width: 100%;
      max-height: 70vh;
      border-radius: 2px;
      object-fit: contain;
      display: block;
    }

    /* Overlay container for clickable areas */
    .overlay-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    /* Individual clickable area */
    .floor-space-area {
      position: absolute;
      display: flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
      pointer-events: auto;
      opacity: 0.3;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid rgba(0,0,0,0.2);
      color: #1a1a1a;
    }

    .floor-space-area:hover {
      opacity: 0.5;
      border-color: rgba(0,0,0,0.4);
    }

    /* Form Styling */
    form {
      background: white;
      padding: 24px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      max-width: 400px;
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      cursor: grab;
      z-index: 1000;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08);
    }

    form:active {
      cursor: grabbing;
    }

    form.hidden {
      display: none;
    }

    form h3 {
      font-size: 18px;
      font-weight: 500;
      color: #1a1a1a;
      margin-bottom: 20px;
      padding-right: 30px;
    }

    label {
      display: block;
      font-size: 12px;
      font-weight: 500;
      margin-bottom: 6px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    textarea {
      width: 100%;
      padding: 10px;
      margin-bottom: 16px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      font-size: 14px;
      background-color: #fafafa;
      font-family: inherit;
      resize: vertical;
      min-height: 80px;
      transition: border-color 0.2s ease;
    }

    textarea:focus {
      border-color: #1a1a1a;
      outline: none;
      background-color: white;
    }

    /* Close button */
    button[type="button"] {
      background: white;
      color: #1a1a1a;
      border: 1px solid #e0e0e0;
      padding: 6px;
      border-radius: 2px;
      cursor: pointer;
      font-size: 16px;
      font-weight: 400;
      position: absolute;
      top: 12px;
      right: 12px;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    button[type="button"]:hover {
      background: #fafafa;
      border-color: #1a1a1a;
    }

    /* Files section */
    #misc-files {
      margin-top: 8px;
      padding: 12px;
      background: #fafafa;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
    }

    #misc-files-list {
      list-style: none;
      padding-left: 0;
    }

    #misc-files-list li {
      margin-bottom: 6px;
      padding: 6px 8px;
      background: white;
      border: 1px solid #e0e0e0;
      border-radius: 2px;
      transition: all 0.15s ease;
    }

    #misc-files-list li:hover {
      border-color: #1a1a1a;
    }

    #misc-files-list a {
      color: #1a1a1a;
      text-decoration: none;
      font-size: 13px;
      font-weight: 400;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    #misc-files-list a:before {
      content: "→";
      font-size: 14px;
    }

    #misc-files-list a:hover {
      text-decoration: underline;
    }

    .no-files {
      color: #999;
      font-size: 13px;
      text-align: center;
      padding: 8px;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      body {
        padding: 12px;
      }

      .header h1 {
        font-size: 22px;
      }

      .image-container {
        padding: 20px;
      }

      form {
        width: 90%;
        max-width: 90%;
        padding: 20px;
      }

      #floor-plan {
        max-height: 50vh;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${folderName}</h1>
    <p>Interactive Floor Plan</p>
  </div>

  <div class="file-input-wrapper">
    <label for="new-image">
      Replace Image
      <input type="file" id="new-image" accept="image/*">
    </label>
  </div>

  <div class="main-container">
    <div class="image-container">
      <div class="image-wrapper">
        <img id="floor-plan" alt="Floor Plan">
        <div class="overlay-container" id="overlay-container">
          <!-- Clickable areas will be inserted here by JavaScript -->
        </div>
      </div>
    </div>
  </div>

  <form id="floor-space-form" hidden>
    <button type="button" id="close-form">×</button>
    <h3 id="space-name"></h3>
    <label for="space-desc">Description</label>
    <textarea id="space-desc" readonly></textarea>
    <label for="space-files">Files</label>
    <div id="misc-files">
      <ul id="misc-files-list"></ul>
    </div>
  </form>

  <script>
    // Floor spaces data from the editor
    const floorSpaces = ${JSON.stringify(floorSpaces)};
    const originalImageName = "${imageName}";
    const originalImageWidth = ${imageNaturalWidth};
    const originalImageHeight = ${imageNaturalHeight};

    // DOM references
    const form = document.getElementById('floor-space-form');
    const nameField = document.getElementById('space-name');
    const desc = document.getElementById('space-desc');
    const miscFilesList = document.getElementById('misc-files-list');
    const newImageInput = document.getElementById('new-image');
    const floorPlanImage = document.getElementById('floor-plan');
    const overlayContainer = document.getElementById('overlay-container');

    // Load the original image
    window.addEventListener("load", () => {
      floorPlanImage.src = "./assets/" + originalImageName;
      floorPlanImage.onload = () => {
        updateOverlayAreas();
      };
    });

    // Close form button
    document.getElementById('close-form').addEventListener('click', () => {
      form.hidden = true;
    });

    /**
     * Updates the position and size of overlay areas based on current image dimensions
     */
    function updateOverlayAreas() {
      // Clear existing areas
      overlayContainer.innerHTML = '';

      // Get current displayed dimensions
      const displayedWidth = floorPlanImage.clientWidth;
      const displayedHeight = floorPlanImage.clientHeight;

      // Calculate scale factors
      const scaleX = displayedWidth / originalImageWidth;
      const scaleY = displayedHeight / originalImageHeight;

      // Create overlay areas for each floor space
      floorSpaces.forEach(fs => {
        const { minX, minY, maxX, maxY } = fs.coordinates;

        // Scale coordinates to match displayed image size
        const scaledMinX = minX * scaleX;
        const scaledMinY = minY * scaleY;
        const scaledMaxX = maxX * scaleX;
        const scaledMaxY = maxY * scaleY;

        const width = scaledMaxX - scaledMinX;
        const height = scaledMaxY - scaledMinY;

        // Create the clickable area
        const area = document.createElement('a');
        area.className = 'floor-space-area';
        area.dataset.id = fs.id;
        area.title = fs.name;
        area.style.left = scaledMinX + 'px';
        area.style.top = scaledMinY + 'px';
        area.style.width = width + 'px';
        area.style.height = height + 'px';
        area.style.backgroundColor = fs.color;
        area.textContent = fs.name;

        // Add click handler
        area.addEventListener('click', (event) => {
          event.preventDefault();
          showFloorSpaceDetails(fs);
        });

        overlayContainer.appendChild(area);
      });
    }

    /**
     * Displays the details of a floor space in the form
     * @param {Object} fs - Floor space object
     */
    function showFloorSpaceDetails(fs) {
      // Clear previous file list
      miscFilesList.innerHTML = '';

      // Populate form fields
      nameField.innerText = fs.name;
      desc.value = fs.desc;

      // Create clickable file links
      if (fs.fileNames && fs.fileNames.length > 0) {
        fs.fileNames.forEach(name => {
          const li = document.createElement('li');
          const a = document.createElement('a');
          a.href = "./assets/" + fs.id + "-" + name;
          a.target = "_blank";
          a.textContent = name;
          li.appendChild(a);
          miscFilesList.appendChild(li);
        });
      } else {
        const noFiles = document.createElement('div');
        noFiles.className = 'no-files';
        noFiles.textContent = 'No files attached';
        miscFilesList.appendChild(noFiles);
      }

      form.hidden = false;
    }

    // Update overlay areas when window is resized
    window.addEventListener('resize', updateOverlayAreas);

    // Form dragging functionality
    let offsetX, offsetY, isDragging = false;

    form.addEventListener("mousedown", (event) => {
      isDragging = true;
      offsetX = event.clientX - form.getBoundingClientRect().left;
      offsetY = event.clientY - form.getBoundingClientRect().top;
    });

    document.addEventListener("mousemove", (event) => {
      if (isDragging) {
        form.style.left = event.clientX - offsetX + "px";
        form.style.top = event.clientY - offsetY + "px";
        form.style.transform = 'none';
      }
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
    });

    // Replace image functionality
    newImageInput.addEventListener("change", function (event) {
      const file = event.target.files[0];

      if (file) {
        const reader = new FileReader();

        reader.onload = function (e) {
          floorPlanImage.src = e.target.result;
          floorPlanImage.onload = () => {
            updateOverlayAreas();
          };
        };

        reader.readAsDataURL(file);
      }
    });
  </script>
</body>
</html>
`;
}

/**
 * Triggers download of ZIP file on desktop
 * @param {Blob} blob - ZIP file blob
 * @param {string} filename - Name for the downloaded file
 */
function downloadProjectFolder(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Converts a data URL to a Blob object
 * @param {string} dataURL - Data URL string
 * @returns {Blob} Blob object
 */
function dataURLToBlob(dataURL) {
  const [header, base64] = dataURL.split(",");
  const mime = header.match(/:(.*?);/)[1];
  const binary = atob(base64);
  const len = binary.length;
  const u8arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    u8arr[i] = binary.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Finds a floor plan by ID
 * @param {string|number} id - Floor plan ID
 * @returns {Object|undefined} Floor plan object
 */
function findFloorPlan(id) {
  return floorSpaces.find((fs) => fs.id == id);
}

/**
 * Checks if two coordinate objects are equal
 * @param {Object} a - First coordinate object
 * @param {Object} b - Second coordinate object
 * @returns {boolean} True if coordinates match
 */
function coordinatesAreEqual(a, b) {
  return (
    a.minX === b.minX &&
    a.minY === b.minY &&
    a.maxX === b.maxX &&
    a.maxY === b.maxY
  );
}

/**
 * Detects if the user is on a mobile or desktop device
 * @returns {string} "Mobile" or "Desktop"
 */
function detectDeviceType() {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;

  if (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      userAgent,
    )
  ) {
    return "Mobile";
  } else {
    return "Desktop";
  }
}

/**
 * Converts a Blob to base64 string
 * @param {Blob} blob - Blob to convert
 * @returns {Promise<string>} Base64 string
 */
async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Saves and shares the project ZIP on mobile devices
 * @param {string} project - Base64 encoded ZIP file
 */
async function downloadMobileProjectFolder(project) {
  try {
    // Write the file to the Documents directory
    const result = await Filesystem.writeFile({
      path: `${projectName.value.trim()}.zip`,
      data: project,
      directory: Directory.Documents,
      recursive: true,
    });

    console.log("File saved at:", result.uri);

    // Open share dialog for mobile users
    if (deviceType === "Mobile") {
      await Share.share({
        title: `${projectName.value.trim()}.zip`,
        text: "Export your floor plan project",
        url: result.uri,
        dialogTitle: "Save or Share Project",
      });
    }

    return result;
  } catch (error) {
    console.error("Error saving file:", error);
    alert("Failed to save project: " + error.message);
  }
}

/**
 * Displays the next image in the images array
 */
function showImage() {
  console.log(images);
  if (!images.length) return;

  image.innerHTML = ""; // clear current image

  const img = document.createElement("img");
  img.src = URL.createObjectURL(images[count]);
  // img.style.width = "100%";
  // img.style.height = "100%";
  img.style.objectFit = "contain";
  img.alt = `Floor Plan: ${images[count].name}`;
  img.classList.add("image-map");
  img.id = images[count].name;
  image.appendChild(img);
}

function getCurrentImageName() {
  const currentImage = document.querySelector(".image-map");
  let imageName = currentImage.id;
  return imageName;
}
