# Image Map Generator

## Overview
Image Map Generator is a tool for creating interactive image maps. Users can:

- Upload an image
- Draw square-based annotations on the image
- Attach additional data (e.g. PDF files) to each annotation
- Export all image-map data as a ZIP archive

The project is designed to run as a hybrid mobile application. Due to mobile platform security restrictions (file access and export), the app must be run through a Capacitor wrapper rather than as a standalone mobile web app.

---

## Tech Stack

- **Node.js** – development and build tooling
- **Vite** – frontend build tool
- **HTML / CSS / JavaScript** – frontend (vanilla JS)
- **Annotorious** – image annotation library  
  https://annotorious.dev/getting-started/
- **Capacitor** – mobile runtime wrapper  
  https://capacitorjs.com/docs
- **Make** – optional task runner for build shortcuts

---

## Quick Start

### Prerequisites
- Node.js (see `.nvmrc` if present)
- npm
- (Optional) `make`

### Setup
```sh
git clone <repo-url>
cd image-map-generator
npm install

### Development
npm run dev

### Build
# If make is installed
make build

# Otherwise
npm run build
```

## Glossary

- **Image Map**  
  An image with clickable or tappable square areas. Each area can have extra information or files attached to it.

- **Annotation**  
  A square drawn on top of an image to mark an interactive area. Users create these by clicking and dragging on the image.

- **Capacitor**  
  A tool that lets this project run as a phone app instead of just a website. It is needed so the app can save and export files on a phone.

- **Vite**  
  A tool that helps developers run the app on their computer while working on it and prepares it for sharing or publishing.

- **Make**  
  An optional helper tool that runs common commands for you so you don’t have to type long instructions each time.
