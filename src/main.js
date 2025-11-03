import { createImageAnnotator } from "@annotorious/annotorious";
import "@annotorious/annotorious/annotorious.css";
import fs from "fs";
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
const floorSpace = {
  // Object designed to hold data regarding all spaces on a given floor
  id: 0, // ID of the mapping (this is found from the annotation object)
  name: "", // The name of the floor space
  desc: "", // Any relevant text regarding the floor space
  files: "", // This is going to be a list file paths that points to an assets folder in the output
  coordinates: 0, // Also found with the annotation object, used to help create the image map element
  geometry: "", // The type of shape the annotation takes (Rectangle, Polygon, etc...)
};
let floorSpaces = []; // List of floorSpace objects
let annotationID = 0; // This is the temp variable for the annotations unique id upon creation
let annotationCoordinates = { minX: 0, minY: 0, maxX: 0, maxY: 0 }; // This is the temp object containig the bounds of the annotation upon creation
let currentAnnotation = 0; // Temporary variable for storing current annotation ID upon updating
let currentCoordinates = 0; // Temporary vraiable for storing current annotation coordinates upon updating
let newCoordinates = { minX: 0, minY: 0, maxX: 0, maxY: 0 }; // This is a temp object for storing the new coordinates of the floor space
// Image map order (minX,minY,maxX,maxY)

// Event listeners
imageInput.addEventListener("change", function (event) {
  const file = event.target.files[0];

  if (file) {
    const reader = new FileReader();

    reader.onload = function (e) {
      console.log(e);
      image.alt = `Floor Plan: ${file.name}`;
      image.src = e.target.result;
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
    console.log("Current Floor plan files: ", currentFloorSpace.files);
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
    const dataTransfer = new DataTransfer(); // Object used to move files
    currentFloorSpace.files.forEach((file) => {
      dataTransfer.items.add(file);
    });
    console.log(dataTransfer.files);
    updateSpaceFormFilesInput.files = dataTransfer.files;
    updateSpaceForm.hidden = false;
  });

  anno.on('clickAnnotation', (a) =>{
    // Click event for an annotation
    /**
     * @todo Upon clicking an annotation, the update space form should display
     */
    console.log("Open annotation")
    updateSpaceForm.hidden = false;
    const currentFloorSpace = findFloorPlan(a.id);
    updateSpaceFormDescInput.value = currentFloorSpace.desc;
    updateSpaceFormNameInput.value = currentFloorSpace.name;
    // Add the files to the form
    const dataTransfer = new DataTransfer(); // Object used to move files
    currentFloorSpace.files.forEach((file) => {
      dataTransfer.items.add(file);
    });
    console.log(dataTransfer.files);
    updateSpaceFormFilesInput.files = dataTransfer.files;
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

updateSpaceFormDeleteButton.addEventListener("click", () => {
  // This button will remove the annotation from the list and hide the update-space-form
  console.log("Deleting annotation from annotaitons");
  console.log("Pre-delete: ", floorSpaces.length);
  const floorPlan = findFloorPlan(currentAnnotation);
  anno.removeAnnotation(floorPlan.id);
  floorSpaces.pop(floorPlan);
  updateSpaceForm.hidden = true;
  console.log("Post-delete", floorSpaces.length);
});

updateSpaceFormSaveButton.addEventListener("click", () => {
  // This button will update any changes made to the annotation object
  // Remove first before updating
  const floorPlan = findFloorPlan(currentAnnotation);
  floorSpaces.pop(floorPlan);
  // Add new data to the form
  const data = new FormData(updateSpaceForm);
  if (coordinatesAreEqual(newCoordinates, currentCoordinates)) {
    floorSpace.coordinates = currentCoordinates;
  } else {
    floorSpace.coordinates = newCoordinates;
  }
  floorSpace.id = currentAnnotation;
  floorSpace.desc = data.get("desc");
  floorSpace.name = data.get("name");
  floorSpace.files = data.getAll("files");
  floorSpace.geometry = "rect";
  floorSpaces.push(floorSpace);
  updateSpaceForm.hidden = true;
  console.log("Updated Floor space", floorSpaces);
});

newSpaceFormSaveButton.addEventListener("click", () => {
  // This button will push the floorSpace object to the list and hide the newSpace Form
  const data = new FormData(newSpaceForm);
  floorSpace.coordinates = annotationCoordinates;
  floorSpace.id = annotationID;
  floorSpace.desc = data.get("desc");
  floorSpace.name = data.get("name");
  floorSpace.files = data.getAll("files");
  floorSpace.geometry = "rect";
  floorSpaces.push(floorSpace);
  newSpaceForm.hidden = true;
  console.log("New floor spce created: ", floorSpaces);
});

// Add a way to drag and move the pop-ups (later implementation)

submitProject.addEventListener("click", async () => {
  // Create directories (project name and assets directory)
  createDirectories();
  // Create the files (index.html,index.css,index.js,assets/files)
  createFiles();
  // Write all pertinent info to the files (Create the html, css, and js.
  //  Will also need to write the files to the assets folder)
  writeToFiles();
  // Zip the folder
  await zipProjectFolder();
  // Download zipped folder
  downloadProjectFolder();
});

// Functions

function createDirectories() {
  // Creates the necessary folders to write to
  const folderName = projectName.ariaValueMax;
  const assets = `./${folderName}/assets`;

  // Create directories if they don't exist
  for (const dir of [folderName, assets]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created: ${dir}`);
    }
  }
}

function writeToFiles() {
  // This will need to be a loop where for each mapping create a new image map (html)
  // This loop will also need to add onclick events for each image map
  // This will need to be a loop where we create onclick events for each image map and creates associated variables for this as well
  // It will need to create the variables (Dom elements for button clicks) first and then the click events.
  // The click events will be for the image maps opening a popup
  // Inside the popup there can be static or dynamic values that are generated
  // Each newly created popup will also need one event that is tied to the pop-ups close button
  // The css can be static with general styles, although the amount of elements created is going to matter
  // If we are to auto load data statically then there will need to be unique css for each popup, which will be a lot
  // If we are to autofill each popup, then we will need the image map objects and whenever a popup is clicked, it
  // will need to search the image map object for the coordinates and then auto populate
}

async function zipProjectFolder() {
  // Using JSZip, this will zip the project folder
  const zip = new JSZip();

  // Helper function to recursively add folder contents to the ZIP
  function addFolderToZip(zipObj, folderPath) {
    const items = fs.readdirSync(folderPath);
    items.forEach((item) => {
      const itemPath = path.join(folderPath, item);
      const stats = fs.statSync(itemPath);
      if (stats.isDirectory()) {
        const folderZip = zipObj.folder(item);
        addFolderToZip(folderZip, itemPath);
      } else {
        const fileData = fs.readFileSync(itemPath);
        zipObj.file(item, fileData);
      }
    });
  }

  // Add parent folder contents
  addFolderToZip(zip, folderName);

  // Generate and save the zip file
  const content = await zip.generateAsync({ type: "nodebuffer" });
  fs.writeFileSync(`${folderName}.zip`, content);
}

function downloadProjectFolder() {
  // Downloads the zipped project folder
  const link = document.createElement("a");
  link.href = url;
  link.download = `${projectName.value}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
