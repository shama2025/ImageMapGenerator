import { createImageAnnotator } from "@annotorious/annotorious";
import "@annotorious/annotorious/annotorious.css";
import JSZip from "jszip";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

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
const anno = createImageAnnotator(image);
let floorSpaces = [];
let annotationID = 0;
let annotationCoordinates = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
let currentAnnotation = 0;
let currentCoordinates = 0;
let newCoordinates = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
let imageName = "";
let imageDataURL = "";
let offsetX = 0;
let offsetY = 0;
let isDragging = false;
let deviceType = "";

// Annotorious Setup
window.addEventListener("DOMContentLoaded", () => {
  if (!image) {
    console.error("Image not found!");
    return;
  }

  anno.on("createAnnotation", (a) => {
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
    currentAnnotation = a.id;
    const currentFloorSpace = findFloorPlan(currentAnnotation);
    currentCoordinates = currentFloorSpace.coordinates;

    newCoordinates.maxX = a.target.selector.geometry.bounds.maxX.toFixed(2);
    newCoordinates.maxY = a.target.selector.geometry.bounds.maxY.toFixed(2);
    newCoordinates.minX = a.target.selector.geometry.bounds.minX.toFixed(2);
    newCoordinates.minY = a.target.selector.geometry.bounds.minY.toFixed(2);

    updateSpaceFormDescInput.value = currentFloorSpace.desc;
    updateSpaceFormNameInput.value = currentFloorSpace.name;

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

// Event Listeners

window.addEventListener("load", (async) => {
  deviceType = detectDeviceType();
});

newSpaceFormCloseButton.addEventListener("click", () => {
  newSpaceForm.hidden = true;
});

updateSpaceFormCloseButton.addEventListener("click", () => {
  updateSpaceForm.hidden = true;
});

updateSpaceFormDeleteButton.addEventListener("click", async () => {
  const floorPlan = findFloorPlan(currentAnnotation);
  anno.removeAnnotation(floorPlan.id);
  floorSpaces = floorSpaces.filter((fs) => fs.id !== floorPlan.id);
  updateSpaceForm.hidden = true;
});

updateSpaceFormSaveButton.addEventListener("click", async () => {
  const data = new FormData(updateSpaceForm);
  const index = floorSpaces.findIndex((f) => f.id === currentAnnotation);
  const files = data.getAll("files");

  if (index !== -1) {
    floorSpaces[index] = {
      ...floorSpaces[index],
      name: data.get("name"),
      desc: data.get("desc"),
      files,
      coordinates: coordinatesAreEqual(newCoordinates, currentCoordinates)
        ? currentCoordinates
        : newCoordinates,
      fileNames: files.map((f) => f.name),
      color: data.get("color"),
    };
  }

  updateSpaceForm.hidden = true;
});

newSpaceFormSaveButton.addEventListener("click", async () => {
  const data = new FormData(newSpaceForm);
  const files = data.getAll("files");

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

  annotationCoordinates = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  floorSpaces.push(floorSpace);
  newSpaceForm.hidden = true;
});

// Dragging Forms
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

imageInput.addEventListener("change", function (event) {
  const file = event.target.files[0];

  if (file) {
    const reader = new FileReader();

    reader.onload = function (e) {
      image.alt = `Floor Plan: ${file.name}`;
      image.src = e.target.result;
      imageDataURL = e.target.result;
      imageName = file.name;
    };

    reader.readAsDataURL(file);
  }
});

submitProject.addEventListener("click", async () => {
  const zipBlob = await createAndZipProject();
  if (deviceType == "Mobile") {
    // Convert to base64
    const base64 = await blobToBase64(zipBlob);
    downloadMobilePorjectFolder(base64);
  } else {
    downloadProjectFolder(zipBlob, `${projectName.value.trim()}.zip`);
  }
});

// Utility Functions
async function createAndZipProject() {
  const zip = new JSZip();
  const folderName = projectName.value.trim();
  const assetsFolder = zip.folder(`${folderName}/assets`);

  const imageBlob = dataURLToBlob(imageDataURL);
  assetsFolder.file(imageName, imageBlob);

  floorSpaces.forEach((fs) => {
    fs.files.forEach((file) => {
      assetsFolder.file(`${fs.id}-${file.name}`, file);
    });
  });

  // Generate HTML content for ZIP
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
    #floor-plan {
      pointer-events: auto;
      / *width: 70%; /* make bigger than default */
      /* max-width: 1000px;*/
      /* height: 1000px;*/
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
      display: block;
    }

    /* Floor map interaction areas */
    area {
      display: block;
      outline: none;
      pointer: cursor;
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
      position: fixed;
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
 <input type="file" id="new-image">

<div class="image-container" style="position: relative; display: inline-block;">
  <img id="floor-plan" alt="Floor Plan">

  ${floorSpaces
    .map((fs) => {
      const { minX, minY, maxX, maxY } = fs.coordinates;
      const width = maxX - minX;
      const height = maxY - minY;

      return `
        <a
          data-id="${fs.id}"
          title="${fs.name}"
          style="
            position: absolute;
            left: ${minX}px;
            top: ${minY}px;
            width: ${width}px;
            height: ${height}px;
            background: ${fs.color};
            color: #000;
            display: flex;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            font-size: 14px;
            pointer-events: auto;
            opacity: 0.8;
          "
        >
          ${fs.name}
        </a>
      `;
    })
    .join("\n")}
</div>


<form id="floor-space-form" hidden>
  <button type="button" id="close-form">X</button>
  <h3 id="space-name"></h3>
  <label for="space-desc">Description:</label>
  <textarea id="space-desc" readonly></textarea>
  <label for="space-files">Files:</label>
  <div id="misc-files">
      <ul id="misc-files-list"></ul>
  </div>
</form>

<script>
  const form = document.getElementById('floor-space-form');
  const nameField = document.getElementById('space-name');
  const desc = document.getElementById('space-desc');
  const areas = document.querySelectorAll('a');
  const miscFilesList = document.getElementById('misc-files-list');
  const newImageMap = document.getElementById('new-image');
  const floorPlanImage = document.getElementById('floor-plan');

  // floorSpaces object passed from JS
  const floorSpaces = ${JSON.stringify(floorSpaces)};
  document.getElementById('close-form').addEventListener('click', () => form.hidden = true);

  window.addEventListener("load", (event) =>{
      floorPlanImage.src = "./assets/" + "${imageName}";
  }) 
      //chrome://inspect/#devices used for testing app

  areas.forEach(area => {
    area.addEventListener('click', event => {
      event.preventDefault();

      // Clear List of href
      miscFilesList.innerHTML = '';
      const fs = floorSpaces.find(f => f.id == area.dataset.id);
      nameField.innerText = fs.name;
      desc.value = fs.desc;
      form.hidden = false;

      // Create a list of clickable files
      fs.fileNames.forEach(name =>{
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = "./assets/"+fs.id+"-"+name;
        a.target="_blank";
        a.textContent = name;
        li.appendChild(a);
        miscFilesList.appendChild(li);
      });
    });
  });

  // Drag form functionality
  let offsetX, offsetY, isDragging = false;

  form.addEventListener("mousedown", (event) => {
    isDragging = true;
    offsetX = event.clientX - form.getBoundingClientRect().left;
    offsetY = event.clientY - form.getBoundingClientRect().top;
    form.style.cursor = "grabbing";
  });

  document.addEventListener("mousemove", (event) => {
    if (isDragging) {
      form.style.left = event.clientX - offsetX + "px";
      form.style.top = event.clientY - offsetY + "px";
    }
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
    form.style.cursor = "grab";
  });

  newImageMap.addEventListener("change", function (event) {
  const file = event.target.files[0];

  if (file) {
    const reader = new FileReader();

    reader.onload = function (e) {
      console.log(e);
      floorPlanImage.src = e.target.result;
    };

    reader.readAsDataURL(file);
  }
});
</script>
`;

  zip.file(`${folderName}/index.html`, content);

  return await zip.generateAsync({ type: "blob" });
}

function downloadProjectFolder(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function dataURLToBlob(dataURL) {
  const [header, base64] = dataURL.split(",");
  const mime = header.match(/:(.*?);/)[1];
  const binary = atob(base64);
  const len = binary.length;
  const u8arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) u8arr[i] = binary.charCodeAt(i);
  return new Blob([u8arr], { type: mime });
}

function findFloorPlan(id) {
  return floorSpaces.find((fs) => fs.id == id);
}

function coordinatesAreEqual(a, b) {
  return (
    a.minX === b.minX &&
    a.minY === b.minY &&
    a.maxX === b.maxX &&
    a.maxY === b.maxY
  );
}

function detectDeviceType() {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;

  // Regular expression to check for common mobile device identifiers
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

async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function downloadMobilePorjectFolder(project) {
  await Filesystem.writeFile({
    path: `${projectName.value.trim()}.zip`,
    data: project,
    directory: Directory.Documents,
    recursive: true,
    encoding: Encoding.BASE64,
  });

  // Uncomment if you want to force the user to share via email
  // Update this so the user has the option to share
  // Add a button that will only appear after project is saved
  // await Share.share({
  //   title: 'Project ZIP',
  //   url: uri,
  // })
}
