import { createImageAnnotator } from '@annotorious/annotorious';
import '@annotorious/annotorious/annotorious.css';
import fs from 'fs';
import JSZip from 'jszip';

// DOM variables
const imageInput = document.getElementById('image-input')
const image = document.getElementById('floor-plan')
const newSpaceForm = document.getElementById('new-space-form');
const newSpaceFormCloseButton = document.getElementById('new-space-close-btn');
const updateSpaceForm = document.getElementById('update-space-form');
const updateSpaceFormCloseButton = document.getElementById('update-space-close-btn');
const updateSpaceFormDeleteButton = document.getElementById('update-space-delete-btn');
const updateSpaceFormSaveButton = document.getElementById('update-space-save-btn');
const newSpaceFormSaveButton = document.getElementById('new-space-save-btn')
const projectName = document.getElementById('dir-name');
const submitProject = document.getElementById('submit-floor-plan');

// Utility Variables
const floorSpaces = { // Object designed to hold data regarding all spaces on a given floor
  id:0, // ID of the mapping (this is found from the annotation object)
  name: '', // The name of the floor space
  desc: '', // Any relevant text regarding the floor space
  files: ['',''], // This is going to be a list file paths that points to an assets folder in the output
  coordinates: 0, // Also found with the annotation object, used to help create the image map element
  geometry: '' // The type of shape the annotation takes (Rectangle, Polygon, etc...)
}

let annotaitonId = 0; // This is the temp variable for the annotations unique id
let annotaitonCoordinates = {x: 0 , y:0 , w:0, h: 0}; // This is the temp object containig the bounds of the annotation

// Example of annotation object

// id: "92e60592-0af7-4363-af4a-bbe6fde2e854"

// target: Object

// annotation: "92e60592-0af7-4363-af4a-bbe6fde2e854"

// created: Thu Oct 30 2025 19:36:41 GMT-0400 (Eastern Daylight Time)

// creator: {isGuest: true, id: "mgAwtxXPP3bMXKOV5S6O"}

// selector: Object

// geometry: {bounds: Object, x: 30, y: 86, w: 79, h: 60}

// type: "RECTANGLE"

// Event listeners
imageInput.addEventListener("change", function (event) {
  const file = event.target.files[0];

  if (file) {
    const reader = new FileReader();

    reader.onload = function (e) {
      console.log(e)
      image.alt = `Floor Plan: ${file.name}`
      image.src = e.target.result;
    };

    reader.readAsDataURL(file);
  }
});

window.addEventListener('DOMContentLoaded', () => {
  if (!image) {
    console.error('Image not found!');
    return;
  }
  // Create Annotorious instance
  const anno = createImageAnnotator(image);

  // Creates the annotation
  anno.on('createAnnotation', (a) => {
    newSpaceForm.hidden = false
    console.log(a)
    // Update this to display when the user finishes the annotation
  });

  anno.on('updateAnnotation', (a) => {
    updateSpaceForm.hidden = false
  });

  // anno.on('updateAnnotation', (a) => console.log('Updated:', a));
  anno.on('deleteAnnotation', (a) => console.log('Deleted:', a));
});

// Hides the new space form popup
newSpaceFormCloseButton.addEventListener('click', () => {
  console.log("Close new space popup")
  newSpaceForm.hidden = true;
});

// Hides the update space form popup
updateSpaceFormCloseButton.addEventListener('click', () => {
  console.log("Close update space popup")
  updateSpaceForm.hidden = true;
});

updateSpaceFormDeleteButton.addEventListener('click', () => {
  // This button will remove the annotation from the list and hide the update-space-form
  console.log("Deleting annotation from annotaitons")
  updateSpaceForm.hidden = true
});

updateSpaceFormSaveButton.addEventListener('click', () => {
  // This button will update any changes made to the annotation object
  updateSpaceForm.hidden = true
});

newSpaceFormSaveButton.addEventListener('click', () => {
  // This button will add the annotation object to the list and hide the newSpace Form
  newSpaceForm.hidden = true
})

// Add a way to drag and move the pop-ups (later implementation)

submitProject.addEventListener('click', async () =>{
  // Create directories (project name and assets directory)
  createDirectories()
  // Create the files (index.html,index.css,index.js,assets/files)
  createFiles()
  // Write all pertinent info to the files (Create the html, css, and js.
  //  Will also need to write the files to the assets folder)
  writeToFiles()
  // Zip the folder
  await zipProjectFolder()
  // Download zipped folder
  downloadProjectFolder()
});

// Functions

function createDirectories(){
  // Creates the necessary folders to write to
  const folderName = projectName.ariaValueMax;
  const assets = `./${folderName}/assets`

  // Create directories if they don't exist
  for (const dir of [folderName, assets]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created: ${dir}`);
    }
}
}

function writeToFiles(){
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

async function zipProjectFolder(){
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

function downloadProjectFolder(){
  // Downloads the zipped project folder
  const link = document.createElement('a');
  link.href = url;
  link.download = `${projectName.value}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}