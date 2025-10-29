import { createImageAnnotator } from '@annotorious/annotorious';
import '@annotorious/annotorious/annotorious.css';

// DOM variables
const imageInput = document.getElementById('image-input')
const image = document.getElementById('floor-plan')

// Event listeners
imageInput.addEventListener("change", function(event) {
    const file = event.target.files[0];

    if (file) {
      const reader = new FileReader();

      reader.onload = function(e) {
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
  const anno = createImageAnnotator( image );

  // Listen for events
  anno.on('createAnnotation', (a) => console.log('Created:', a));
  anno.on('updateAnnotation', (a) => console.log('Updated:', a));
  anno.on('deleteAnnotation', (a) => console.log('Deleted:', a));
});
