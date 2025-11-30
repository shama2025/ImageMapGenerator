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
let imageDataURL = ""; // The URL for the dataUrl to Blob conversion
//const {exec, ChildProcess} = require('child_process');

// Event listeners
imageInput.addEventListener("change", function (event) {
  const file = event.target.files[0];

  if (file) {
    const reader = new FileReader();

    reader.onload = function (e) {
      console.log(e);
      image.alt = `Floor Plan: ${file.name}`;
      image.src = e.target.result;
      imageDataURL = e.target.result;
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
  const data = new FormData(updateSpaceForm);
  const floorPlan = findFloorPlan(currentAnnotation);
  const index = floorSpaces.findIndex((f) => f.id === currentAnnotation);
  const files = data.getAll("files");
  let fileNames = [];
  files.forEach((file) => {
    fileNames.push(file.name);
  });
  if (index !== -1) {
    floorSpaces[index] = {
      ...floorSpaces[index],
      name: data.get("name"),
      desc: data.get("desc"),
      files: files,
      coordinates: coordinatesAreEqual(newCoordinates, currentCoordinates)
        ? currentCoordinates
        : newCoordinates,
      fileNames: fileNames,
    };
  }
  updateSpaceForm.hidden = true;
  console.log("Updated Floor space", floorSpaces);
});

newSpaceFormSaveButton.addEventListener("click", async () => {
  // This button will push the floorSpace object to the list and hide the newSpace Form
  const data = new FormData(newSpaceForm);
  const files = data.getAll("files");
  let fileNames = [];
  files.forEach((file) => {
    fileNames.push(file.name);
  });
  const floorSpace = {
    // Object designed to hold data regarding all spaces on a given floor
    id: annotationID, // ID of the mapping (this is found from the annotation object)
    name: data.get("name"), // The name of the floor space
    desc: data.get("desc"), // Any relevant text regarding the floor space
    files: files, // This is going to be a list file paths that points to an assets folder in the output
    coordinates: annotationCoordinates, // Also found with the annotation object, used to help create the image map element
    geometry: "rect", // The type of shape the annotation takes (Rectangle, Polygon, etc...)
    // Have an attribute that is a list of the files names
    fileNames: fileNames,
  };
  annotationCoordinates = { minX: 0, minY: 0, maxX: 0, maxY: 0 }; // Resets the coordinates
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

submitProject.addEventListener("click", async () => {
  console.log("Submit Clicked!");

  // Generate project files and zip
  const zipBlob = await createAndZipProject();

  // Trigger download
  downloadProjectFolder(zipBlob, `${projectName.value}.zip`);
});

// Functions

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
  <div class="image-container">
    <img id="floor-plan" alt="Floor Plan">
    ${floorSpaces
      .map(
        (fs) =>
          `<area alt="${fs.name}" title="${fs.name}" coords="${fs.coordinates.minX},${fs.coordinates.minY},${fs.coordinates.maxX},${fs.coordinates.maxY}" shape="${fs.geometry}" data-id="${fs.id}">`,
      )
      .join("\n")}
  </map>

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
  const areas = document.querySelectorAll('.link');
  const miscFilesList = document.getElementById('misc-files-list');
  const newImageMap = document.getElementById('new-image');
  const floorPlanImage = document.getElementById('floor-plan');

  // floorSpaces object passed from JS
  const floorSpaces = ${JSON.stringify(floorSpaces)};
  document.getElementById('close-form').addEventListener('click', () => form.hidden = true);

  window.addEventListener("load", (event) =>{
      floorPlanImage.src = "./assets/" + "${imageName}";
  })

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

// Paste annotorious code here
(function (O, j) {
  typeof exports == "object" && typeof module < "u"
    ? j(exports)
    : typeof define == "function" && define.amd
      ? define(["exports"], j)
      : ((O = typeof globalThis < "u" ? globalThis : O || self),
        j((O.Annotorious = {})));
})(this, function (O) {
  "use strict";
  var Rr = Object.defineProperty;
  var Vr = (O, j, Ce) =>
    j in O
      ? Rr(O, j, { enumerable: !0, configurable: !0, writable: !0, value: Ce })
      : (O[j] = Ce);
  var sn = (O, j, Ce) => Vr(O, typeof j != "symbol" ? j + "" : j, Ce);
  function j() {}
  function Ce(e, t) {
    for (const n in t) e[n] = t[n];
    return e;
  }
  function rn(e) {
    return e();
  }
  function ln() {
    return Object.create(null);
  }
  function Ae(e) {
    e.forEach(rn);
  }
  function ie(e) {
    return typeof e == "function";
  }
  function re(e, t) {
    return e != e
      ? t == t
      : e !== t || (e && typeof e == "object") || typeof e == "function";
  }
  function qo(e) {
    return Object.keys(e).length === 0;
  }
  function an(e, ...t) {
    if (e == null) {
      for (const o of t) o(void 0);
      return j;
    }
    const n = e.subscribe(...t);
    return n.unsubscribe ? () => n.unsubscribe() : n;
  }
  function kt(e, t, n) {
    e.$$.on_destroy.push(an(t, n));
  }
  function Ko(e, t, n, o) {
    if (e) {
      const i = cn(e, t, n, o);
      return e[0](i);
    }
  }
  function cn(e, t, n, o) {
    return e[1] && o ? Ce(n.ctx.slice(), e[1](o(t))) : n.ctx;
  }
  function Wo(e, t, n, o) {
    if (e[2] && o) {
      const i = e[2](o(n));
      if (t.dirty === void 0) return i;
      if (typeof i == "object") {
        const s = [],
          r = Math.max(t.dirty.length, i.length);
        for (let l = 0; l < r; l += 1) s[l] = t.dirty[l] | i[l];
        return s;
      }
      return t.dirty | i;
    }
    return t.dirty;
  }
  function Zo(e, t, n, o, i, s) {
    if (i) {
      const r = cn(t, n, o, s);
      e.p(r, i);
    }
  }
  function Jo(e) {
    if (e.ctx.length > 32) {
      const t = [],
        n = e.ctx.length / 32;
      for (let o = 0; o < n; o++) t[o] = -1;
      return t;
    }
    return -1;
  }
  function un(e) {
    const t = {};
    for (const n in e) n[0] !== "$" && (t[n] = e[n]);
    return t;
  }
  function je(e) {
    return e ?? "";
  }
  function z(e, t) {
    e.appendChild(t);
  }
  function N(e, t, n) {
    e.insertBefore(t, n || null);
  }
  function B(e) {
    e.parentNode && e.parentNode.removeChild(e);
  }
  function Ye(e, t) {
    for (let n = 0; n < e.length; n += 1) e[n] && e[n].d(t);
  }
  function L(e) {
    return document.createElementNS("http://www.w3.org/2000/svg", e);
  }
  function fn(e) {
    return document.createTextNode(e);
  }
  function we() {
    return fn(" ");
  }
  function ke() {
    return fn("");
  }
  function J(e, t, n, o) {
    return (e.addEventListener(t, n, o), () => e.removeEventListener(t, n, o));
  }
  function c(e, t, n) {
    n == null
      ? e.removeAttribute(t)
      : e.getAttribute(t) !== n && e.setAttribute(t, n);
  }
  function Qo(e) {
    return Array.from(e.childNodes);
  }
  function Pe(e, t, n) {
    e.classList.toggle(t, !!n);
  }
  function xo(e, t, { bubbles: n = !1, cancelable: o = !1 } = {}) {
    return new CustomEvent(e, { detail: t, bubbles: n, cancelable: o });
  }
  let Qe;
  function xe(e) {
    Qe = e;
  }
  function dn() {
    if (!Qe)
      throw new Error("Function called outside component initialization");
    return Qe;
  }
  function Re(e) {
    dn().$$.on_mount.push(e);
  }
  function Oe() {
    const e = dn();
    return (t, n, { cancelable: o = !1 } = {}) => {
      const i = e.$$.callbacks[t];
      if (i) {
        const s = xo(t, n, { cancelable: o });
        return (
          i.slice().forEach((r) => {
            r.call(e, s);
          }),
          !s.defaultPrevented
        );
      }
      return !0;
    };
  }
  function ue(e, t) {
    const n = e.$$.callbacks[t.type];
    n && n.slice().forEach((o) => o.call(this, t));
  }
  const Fe = [],
    ft = [];
  let ze = [];
  const hn = [],
    gn = Promise.resolve();
  let Mt = !1;
  function mn() {
    Mt || ((Mt = !0), gn.then(yn));
  }
  function pn() {
    return (mn(), gn);
  }
  function Tt(e) {
    ze.push(e);
  }
  const Pt = new Set();
  let qe = 0;
  function yn() {
    if (qe !== 0) return;
    const e = Qe;
    do {
      try {
        for (; qe < Fe.length; ) {
          const t = Fe[qe];
          (qe++, xe(t), $o(t.$$));
        }
      } catch (t) {
        throw ((Fe.length = 0), (qe = 0), t);
      }
      for (xe(null), Fe.length = 0, qe = 0; ft.length; ) ft.pop()();
      for (let t = 0; t < ze.length; t += 1) {
        const n = ze[t];
        Pt.has(n) || (Pt.add(n), n());
      }
      ze.length = 0;
    } while (Fe.length);
    for (; hn.length; ) hn.pop()();
    ((Mt = !1), Pt.clear(), xe(e));
  }
  function $o(e) {
    if (e.fragment !== null) {
      (e.update(), Ae(e.before_update));
      const t = e.dirty;
      ((e.dirty = [-1]),
        e.fragment && e.fragment.p(e.ctx, t),
        e.after_update.forEach(Tt));
    }
  }
  function ei(e) {
    const t = [],
      n = [];
    (ze.forEach((o) => (e.indexOf(o) === -1 ? t.push(o) : n.push(o))),
      n.forEach((o) => o()),
      (ze = t));
  }
  const dt = new Set();
  let Ve;
  function be() {
    Ve = { r: 0, c: [], p: Ve };
  }
  function Ee() {
    (Ve.r || Ae(Ve.c), (Ve = Ve.p));
  }
  function R(e, t) {
    e && e.i && (dt.delete(e), e.i(t));
  }
  function G(e, t, n, o) {
    if (e && e.o) {
      if (dt.has(e)) return;
      (dt.add(e),
        Ve.c.push(() => {
          (dt.delete(e), o && (n && e.d(1), o()));
        }),
        e.o(t));
    } else o && o();
  }
  function ve(e) {
    return (e == null ? void 0 : e.length) !== void 0 ? e : Array.from(e);
  }
  function ce(e) {
    e && e.c();
  }
  function le(e, t, n) {
    const { fragment: o, after_update: i } = e.$$;
    (o && o.m(t, n),
      Tt(() => {
        const s = e.$$.on_mount.map(rn).filter(ie);
        (e.$$.on_destroy ? e.$$.on_destroy.push(...s) : Ae(s),
          (e.$$.on_mount = []));
      }),
      i.forEach(Tt));
  }
  function ae(e, t) {
    const n = e.$$;
    n.fragment !== null &&
      (ei(n.after_update),
      Ae(n.on_destroy),
      n.fragment && n.fragment.d(t),
      (n.on_destroy = n.fragment = null),
      (n.ctx = []));
  }
  function ti(e, t) {
    (e.$$.dirty[0] === -1 && (Fe.push(e), mn(), e.$$.dirty.fill(0)),
      (e.$$.dirty[(t / 31) | 0] |= 1 << t % 31));
  }
  function he(e, t, n, o, i, s, r = null, l = [-1]) {
    const a = Qe;
    xe(e);
    const u = (e.$$ = {
      fragment: null,
      ctx: [],
      props: s,
      update: j,
      not_equal: i,
      bound: ln(),
      on_mount: [],
      on_destroy: [],
      on_disconnect: [],
      before_update: [],
      after_update: [],
      context: new Map(t.context || (a ? a.$$.context : [])),
      callbacks: ln(),
      dirty: l,
      skip_bound: !1,
      root: t.target || a.$$.root,
    });
    r && r(u.root);
    let d = !1;
    if (
      ((u.ctx = n
        ? n(e, t.props || {}, (f, h, ...g) => {
            const m = g.length ? g[0] : h;
            return (
              u.ctx &&
                i(u.ctx[f], (u.ctx[f] = m)) &&
                (!u.skip_bound && u.bound[f] && u.bound[f](m), d && ti(e, f)),
              h
            );
          })
        : []),
      u.update(),
      (d = !0),
      Ae(u.before_update),
      (u.fragment = o ? o(u.ctx) : !1),
      t.target)
    ) {
      if (t.hydrate) {
        const f = Qo(t.target);
        (u.fragment && u.fragment.l(f), f.forEach(B));
      } else u.fragment && u.fragment.c();
      (t.intro && R(e.$$.fragment), le(e, t.target, t.anchor), yn());
    }
    xe(a);
  }
  class ge {
    constructor() {
      sn(this, "$$");
      sn(this, "$$set");
    }
    $destroy() {
      (ae(this, 1), (this.$destroy = j));
    }
    $on(t, n) {
      if (!ie(n)) return j;
      const o = this.$$.callbacks[t] || (this.$$.callbacks[t] = []);
      return (
        o.push(n),
        () => {
          const i = o.indexOf(n);
          i !== -1 && o.splice(i, 1);
        }
      );
    }
    $set(t) {
      this.$$set &&
        !qo(t) &&
        ((this.$$.skip_bound = !0), this.$$set(t), (this.$$.skip_bound = !1));
    }
  }
  const ni = "4";
  typeof window < "u" &&
    (window.__svelte || (window.__svelte = { v: new Set() })).v.add(ni);
  var Q = ((e) => (
    (e.ELLIPSE = "ELLIPSE"),
    (e.MULTIPOLYGON = "MULTIPOLYGON"),
    (e.POLYGON = "POLYGON"),
    (e.POLYLINE = "POLYLINE"),
    (e.RECTANGLE = "RECTANGLE"),
    (e.LINE = "LINE"),
    e
  ))(Q || {});
  function oi(e) {
    return e &&
      e.__esModule &&
      Object.prototype.hasOwnProperty.call(e, "default")
      ? e.default
      : e;
  }
  var _n = { exports: {} };
  (function (e) {
    (function () {
      function t(l, a) {
        var u = l.x - a.x,
          d = l.y - a.y;
        return u * u + d * d;
      }
      function n(l, a, u) {
        var d = a.x,
          f = a.y,
          h = u.x - d,
          g = u.y - f;
        if (h !== 0 || g !== 0) {
          var m = ((l.x - d) * h + (l.y - f) * g) / (h * h + g * g);
          m > 1
            ? ((d = u.x), (f = u.y))
            : m > 0 && ((d += h * m), (f += g * m));
        }
        return ((h = l.x - d), (g = l.y - f), h * h + g * g);
      }
      function o(l, a) {
        for (var u = l[0], d = [u], f, h = 1, g = l.length; h < g; h++)
          ((f = l[h]), t(f, u) > a && (d.push(f), (u = f)));
        return (u !== f && d.push(f), d);
      }
      function i(l, a, u, d, f) {
        for (var h = d, g, m = a + 1; m < u; m++) {
          var p = n(l[m], l[a], l[u]);
          p > h && ((g = m), (h = p));
        }
        h > d &&
          (g - a > 1 && i(l, a, g, d, f),
          f.push(l[g]),
          u - g > 1 && i(l, g, u, d, f));
      }
      function s(l, a) {
        var u = l.length - 1,
          d = [l[0]];
        return (i(l, 0, u, a, d), d.push(l[u]), d);
      }
      function r(l, a, u) {
        if (l.length <= 2) return l;
        var d = a !== void 0 ? a * a : 1;
        return ((l = u ? l : o(l, d)), (l = s(l, d)), l);
      }
      ((e.exports = r), (e.exports.default = r));
    })();
  })(_n);
  var ii = _n.exports;
  const si = oi(ii),
    Lt = {},
    Xe = (e, t) => (Lt[e] = t),
    ht = (e) => Lt[e.type].area(e),
    wn = (e, t, n, o) => Lt[e.type].intersects(e, t, n, o),
    fe = (e) => {
      let t = 1 / 0,
        n = 1 / 0,
        o = -1 / 0,
        i = -1 / 0;
      return (
        e.forEach(([s, r]) => {
          ((t = Math.min(t, s)),
            (n = Math.min(n, r)),
            (o = Math.max(o, s)),
            (i = Math.max(i, r)));
        }),
        { minX: t, minY: n, maxX: o, maxY: i }
      );
    },
    $e = (e) => {
      let t = 0,
        n = e.length - 1;
      for (let o = 0; o < e.length; o++)
        ((t += (e[n][0] + e[o][0]) * (e[n][1] - e[o][1])), (n = o));
      return Math.abs(0.5 * t);
    },
    et = (e, t, n) => {
      let o = !1;
      for (let i = 0, s = e.length - 1; i < e.length; s = i++) {
        const r = e[i][0],
          l = e[i][1],
          a = e[s][0],
          u = e[s][1];
        l > n != u > n && t < ((a - r) * (n - l)) / (u - l) + r && (o = !o);
      }
      return o;
    },
    bn = (e, t = !0) => {
      let n = "M ";
      return (
        e.forEach(([o, i], s) => {
          s === 0 ? (n += o + "," + i) : (n += " L " + o + "," + i);
        }),
        t && (n += " Z"),
        n
      );
    },
    It = (e, t = 1) => {
      const n = e.map(([o, i]) => ({ x: o, y: i }));
      return si(n, t, !0).map((o) => [o.x, o.y]);
    },
    tt = (e, t) => {
      const n = Math.abs(t[0] - e[0]),
        o = Math.abs(t[1] - e[1]);
      return Math.sqrt(Math.pow(n, 2) + Math.pow(o, 2));
    },
    ri = {
      area: (e) => Math.PI * e.geometry.rx * e.geometry.ry,
      intersects: (e, t, n) => {
        const { cx: o, cy: i, rx: s, ry: r } = e.geometry,
          l = 0,
          a = Math.cos(l),
          u = Math.sin(l),
          d = t - o,
          f = n - i,
          h = a * d + u * f,
          g = u * d - a * f;
        return (h * h) / (s * s) + (g * g) / (r * r) <= 1;
      },
    };
  Xe(Q.ELLIPSE, ri);
  const li = {
    area: (e) => 0,
    intersects: (e, t, n, o = 2) => {
      const [[i, s], [r, l]] = e.geometry.points,
        a = Math.abs((l - s) * t - (r - i) * n + r * s - l * i),
        u = tt([i, s], [r, l]);
      return a / u <= o;
    },
  };
Xe(Q.LINE, li);
const ai = {
  area: (e) => {
    const { polygons: t } = e.geometry;
    return t.reduce((n, o) => {
      const [i, ...s] = o.rings,
        r = $e(i.points),
        l = s.reduce((a, u) => a + $e(u.points), 0);
      return n + r - l;
    }, 0);
  },
  intersects: (e, t, n) => {
    const { polygons: o } = e.geometry;
    for (const i of o) {
      const [s, ...r] = i.rings;
      if (et(s.points, t, n)) {
        let l = false;
        for (const a of r)
          if (et(a.points, t, n)) {
            l = true;
            break;
          }
        if (!l) return true;
      }
    }
    return false;
  }
},

nt = (e) => {
  const t = e.reduce((n, o) => [].concat(n, o.rings[0].points), []);
  return fe(t);
},

Le = (e) => e.rings.map((n) => bn(n.points)).join(" "),

En = (e) =>
  e.polygons.reduce(
    (t, n) => [].concat(t, n.rings.reduce((o, i) => [].concat(o, i.points), [])),
    []
  ),

ci = (e, t = 1) => {
  const n = e.geometry.polygons.map((i) => {
      const s = i.rings.map((l) => {
          const a = It(l.points, t);
          return { ...l, points: a };
        }),
        r = fe(s[0].points);
      return { ...i, rings: s, bounds: r };
    }),
    o = nt(n);
  return { ...e, geometry: { ...e.geometry, polygons: n, bounds: o } };
};

Xe(Q.MULTIPOLYGON, ai);

const ui = {
  area: (e) => {
    const t = e.geometry.points;
    return $e(t);
  },
  intersects: (e, t, n) => {
    const o = e.geometry.points;
    return et(o, t, n);
  }
},

fi = (e, t = 1) => {
  const n = It(e.geometry.points, t),
    o = fe(n);
  return { ...e, geometry: { ...e.geometry, bounds: o, points: n } };
};

Xe(Q.POLYGON, ui);
const di = {
  area: (e) => {
    const t = e.geometry;
    if (!t.closed || t.points.length < 3) return 0;
    const n = gt(t.points, t.closed);
    return $e(n);
  },
  intersects: (e, t, n, o = 2) => {
    const i = e.geometry;
    if (i.closed) {
      const s = gt(i.points, i.closed);
      return et(s, t, n);
    } else return hi(i, [t, n], o);
  }
},

gt = (e, t = false) => {
  const n = [];
  for (let o = 0; o < e.length; o++) {
    const i = e[o],
      s = e[(o + 1) % e.length];
    if (
      (n.push(i.point),
      (o < e.length - 1 || t) && (i.type === "CURVE" || s.type === "CURVE"))
    ) {
      const l = vn(
        i.point,
        (i.type === "CURVE" && i.outHandle) || i.point,
        (s.type === "CURVE" && s.inHandle) || s.point,
        s.point,
        10
      );
      n.push.apply(n, l.slice(1));
    }
  }
  return n;
},

vn = (e, t, n, o, i = 10) => {
  const s = [];
  for (let r = 0; r <= i; r++) {
    const l = r / i,
      a =
        Math.pow(1 - l, 3) * e[0] +
        3 * Math.pow(1 - l, 2) * l * t[0] +
        3 * (1 - l) * Math.pow(l, 2) * n[0] +
        Math.pow(l, 3) * o[0],
      u =
        Math.pow(1 - l, 3) * e[1] +
        3 * Math.pow(1 - l, 2) * l * t[1] +
        3 * (1 - l) * Math.pow(l, 2) * n[1] +
        Math.pow(l, 3) * o[1];
    s.push([a, u]);
  }
  return s;
},

hi = (e, t, n) => {
  for (let o = 0; o < e.points.length - 1; o++) {
    const i = e.points[o],
      s = e.points[o + 1];
    if (i.type === "CURVE" || s.type === "CURVE") {
      const l = vn(
        i.point,
        (i.type === "CURVE" && i.outHandle) || i.point,
        (s.type === "CURVE" && s.inHandle) || s.point,
        s.point,
        20
      );
      for (let a = 0; a < l.length - 1; a++)
        if (Sn(t, l[a], l[a + 1]) <= n) return true;
    } else if (Sn(t, i.point, s.point) <= n) return true;
  }
  return false;
},

Sn = (e, t, n) => {
  const [o, i] = e,
    [s, r] = t,
    [l, a] = n,
    u = l - s,
    d = a - r,
    f = Math.sqrt(u * u + d * d);
  if (f === 0) return Math.sqrt((o - s) * (o - s) + (i - r) * (i - r));
  const h = ((o - s) * u + (i - r) * d) / (f * f);
  return h <= 0
    ? Math.sqrt((o - s) * (o - s) + (i - r) * (i - r))
    : h >= 1
      ? Math.sqrt((o - l) * (o - l) + (i - a) * (i - a))
      : Math.abs((a - r) * o - (l - s) * i + l * r - a * s) / f;
},

Ct = (e) => {
  if (!e.points || e.points.length === 0) return "";
  const t = [],
    n = e.points[0];
  t.push("M " + n.point[0] + " " + n.point[1]);
  for (let o = 1; o < e.points.length; o++) {
    const i = e.points[o],
      s = e.points[o - 1];
    if (i.type === "CURVE" || s.type === "CURVE") {
      const r = (s.type === "CURVE" && s.outHandle) || s.point,
        l = (i.type === "CURVE" && i.inHandle) || i.point,
        a = i.point;
      t.push(
        "C " +
          r[0] +
          " " +
          r[1] +
          " " +
          l[0] +
          " " +
          l[1] +
          " " +
          a[0] +
          " " +
          a[1]
      );
    } else t.push("L " + i.point[0] + " " + i.point[1]);
  }
  if (e.closed) {
    const o = e.points[e.points.length - 1],
      i = e.points[0];
    if (o.type === "CURVE" || i.type === "CURVE") {
      const r = o.outHandle || o.point,
        l = i.inHandle || i.point,
        a = i.point;
      t.push(
        "C " +
          r[0] +
          " " +
          r[1] +
          " " +
          l[0] +
          " " +
          l[1] +
          " " +
          a[0] +
          " " +
          a[1]
      );
    }
    t.push("Z");
  }
  return t.join(" ");
};

Xe(Q.POLYLINE, di);
const An = {
  area: (e) => e.geometry.w * e.geometry.h,
  intersects: (e, t, n) =>
    t >= e.geometry.x &&
    t <= e.geometry.x + e.geometry.w &&
    n >= e.geometry.y &&
    n <= e.geometry.y + e.geometry.h
};

Xe(Q.RECTANGLE, An);

const ot = (e) => it(e.target),
  it = (e) => {
    var t, n;
    return (
      (e == null ? void 0 : e.annotation) !== void 0 &&
      ((n =
        (t = e == null ? void 0 : e.selector) == null
          ? void 0
          : t.geometry) == null
        ? void 0
        : n.bounds) !== void 0
    );
  },

kn = (e) =>
  (e == null ? void 0 : e.type) === "FragmentSelector"
    ? true
    : typeof e == "string"
      ? e.indexOf("#") < 0
        ? false
        : /^#xywh(?:=(?:pixel:|percent:)?)\s*\d+(\.\d*)?,\s*\d+(\.\d*)?,\s*\d+(\.\d*)?,\s*\d+(\.\d*)?$/i.test(
            e
          )
      : false,

Mn = (e, t = false) => {
  const n = typeof e == "string" ? e : e.value,
    o = /(xywh)=(pixel|percent)?:?(.+?),(.+?),(.+?),(.+)*/g,
    i = [...n.matchAll(o)][0];
  if (!i) throw new Error("Not a MediaFragment: " + n);
  const [s, r, l, a, u, d, f] = i;
  if (r !== "xywh") throw new Error("Unsupported MediaFragment: " + n);
  if (l && l !== "pixel")
    throw new Error("Unsupported MediaFragment unit: " + l);
  const [h, g, m, p] = [a, u, d, f].map(parseFloat);
  return {
    type: Q.RECTANGLE,
    geometry: {
      x: h,
      y: g,
      w: m,
      h: p,
      bounds: {
        minX: h,
        minY: t ? g - p : g,
        maxX: h + m,
        maxY: t ? g : g + p
      }
    }
  };
},

Tn = (e) => {
  const { x: t, y: n, w: o, h: i } = e;
  return {
    type: "FragmentSelector",
    conformsTo: "http://www.w3.org/TR/media-frags/",
    value: "xywh=pixel:" + t + "," + n + "," + o + "," + i
  };
},

Pn = "http://www.w3.org/2000/svg",

Ln = (e) => {
  const t = (o) => {
      Array.from(o.attributes).forEach((i) => {
        i.name.startsWith("on") && o.removeAttribute(i.name);
      });
    },
    n = e.getElementsByTagName("script");
  Array.from(n)
    .reverse()
    .forEach((o) => o.parentNode.removeChild(o));
  Array.from(e.querySelectorAll("*")).forEach(t);
  return e;
},

gi = (e) => {
  const o = new XMLSerializer()
    .serializeToString(e.documentElement)
    .replace("<svg>", '<svg xmlns="' + Pn + '">');     
    return new DOMParser().parseFromString(o, "image/svg+xml")
    .documentElement;
};

mt = (e) => {
  const n = new DOMParser().parseFromString(e, "image/svg+xml"),
    o = n.lookupPrefix(Pn),
    i = n.lookupNamespaceURI(null);
  return o || i ? Ln(n).firstChild : Ln(gi(n)).firstChild;
};
mi = (e) => {
  const t = In(e),
    n = [];
  let o = [],
    i = [0, 0];
  for (const s of t)
    switch (s.type.toUpperCase()) {
      case "M":
        if (o.length > 0) {
          n.push({ points: o });
          o = [];
        }
        i = [s.args[0], s.args[1]];
        o.push([...i]);
        break;
      case "L":
        i = [s.args[0], s.args[1]];
        o.push([...i]);
        break;
      case "H":
        i = [s.args[0], i[1]];
        o.push([...i]);
        break;
      case "V":
        i = [i[0], s.args[0]];
        o.push([...i]);
        break;
      case "C":
        i = [s.args[4], s.args[5]];
        o.push([...i]);
        break;
      case "Z":
        break;
      default:
        console.warn("Unsupported SVG path command: " + s.type);
        break;
    }
  if (o.length > 2) n.push({ points: o });
  if (n.length > 0) {
    const s = fe(n[0].points);
    return { rings: n, bounds: s };
  }
},

pi = (e) => {
  const { point: t, inHandle: n, outHandle: o } = e;
  if (!n || !o) return false;
  const i = n[0] - t[0],
    s = n[1] - t[1],
    r = o[0] - t[0],
    l = o[1] - t[1],
    a = i * l - s * r;
  return Math.abs(a) < 0.01;
},

yi = (e) => {
  const t = In(e);
  let n = [],
    o = [0, 0],
    i = false;
  for (let r = 0; r < t.length; r++) {
    const l = t[r];
    switch (l.type.toUpperCase()) {
      case "M":
        o = [l.args[0], l.args[1]];
        n.push({ type: "CORNER", point: [...o] });
        break;
      case "L":
        o = [l.args[0], l.args[1]];
        n.push({ type: "CORNER", point: [...o] });
        break;
      case "C":
        const a = [l.args[0], l.args[1]],
          u = [l.args[2], l.args[3]],
          d = [l.args[4], l.args[5]];
        if (n.length > 0) {
          const f = n[n.length - 1];
          if (a[0] !== f.point[0] || a[1] !== f.point[1]) {
            f.type = "CURVE";
            f.outHandle = a;
          }
        }
        const h = u[0] !== d[0] || u[1] !== d[1] ? "CURVE" : "CORNER",
          g = { type: h, point: d };
        if (g.type === "CURVE") g.inHandle = u;
        n.push(g);
        o = d;
        break;
      case "Z":
        i = true;
        break;
      default:
        console.warn("Unsupported SVG path command: " + l.type);
        break;
    }
  }
  n = n.map((r) => (pi(r) ? { ...r, locked: true } : r));
  const s = fe(gt(n, i));
  return { points: n, closed: i, bounds: s };
},

In = (e) => {
  const t = [],
    n = e.replace(/,/g, " ").trim(),
    o = /([MmLlHhVvCcZz])\s*([^MmLlHhVvCcZz]*)/g;
  let i;
  while ((i = o.exec(n)) !== null) {
    const [, s, r] = i,
      l =
        r.trim() === ""
          ? []
          : r
              .trim()
              .split(/\s+/)
              .map(Number)
              .filter((a) => !isNaN(a));
    t.push({ type: s, args: l });
  }
  return t;
},

_i = (e) => {
  const match = e.match(/(<polygon points=["|'])([^("|')]*)/);
  const pointsStr = match ? match[2] : "";
  const i = pointsStr.split(" ").map((s) => s.split(",").map(parseFloat));
  return { type: Q.POLYGON, geometry: { points: i, bounds: fe(i) } };
},

wi = (e) => {
  const t = mt(e),
    n = parseFloat(t.getAttribute("cx")),
    o = parseFloat(t.getAttribute("cy")),
    i = parseFloat(t.getAttribute("rx")),
    s = parseFloat(t.getAttribute("ry")),
    r = { minX: n - i, minY: o - s, maxX: n + i, maxY: o + s };
  return { type: Q.ELLIPSE, geometry: { cx: n, cy: o, rx: i, ry: s, bounds: r } };
},

bi = (e) => {
  const t = mt(e),
    n = parseFloat(t.getAttribute("x1")),
    o = parseFloat(t.getAttribute("x2")),
    i = parseFloat(t.getAttribute("y1")),
    s = parseFloat(t.getAttribute("y2")),
    r = { minX: Math.min(n, o), minY: Math.min(i, s), maxX: Math.max(n, o), maxY: Math.max(i, s) };
  return { type: Q.LINE, geometry: { points: [[n, i], [o, s]], bounds: r } };
};
Ei = (e) => {
  const t = mt(e),
    n = t.nodeName === "path" ? t : Array.from(t.querySelectorAll("path"))[0],
    o = n ? n.getAttribute("d") : null;
  if (!o) throw new Error("Could not parse SVG path");
  const i = yi(o);
  if (!i) throw new Error("Could not parse SVG path");
  return { type: Q.POLYLINE, geometry: i };
},

vi = (e) => {
  const t = mt(e),
    i = t.nodeName === "path" ? [t] : Array.from(t.querySelectorAll("path")),
    s = i.map((a) => a.getAttribute("d") || "").map((a) => mi(a)).filter(Boolean),
    r = s.reduce((a, u) => [...a, ...u.rings[0].points], []),
    l = fe(r);
  return s.length === 1 && s[0].rings.length === 1
    ? { type: Q.POLYGON, geometry: { points: r, bounds: l } }
    : { type: Q.MULTIPOLYGON, geometry: { polygons: s, bounds: l } };
},

Cn = (e) => {
  const t = typeof e === "string" ? e : e.value;
  if (t.includes("<polygon points=")) return _i(t);
  if (t.includes("<path ") && (t.includes(" C ") || !t.includes("Z"))) return Ei(t);
  if (t.includes("<path ")) return vi(t);
  if (t.includes("<ellipse ")) return wi(t);
  if (t.includes("<line ")) return bi(t);
  throw "Unsupported SVG shape: " + t;
},
Si = function(e) {
  return "<g>" + e.polygons.map(function(n) {
    return '<path fill-rule="evenodd" d="' + Le(n) + '" />';
  }).join("") + "</g>";
};

On = function(e) {
  var t;
  switch (e.type) {
    case Q.POLYGON: {
      var n = e.geometry,
          o = n.points;
      t = "<svg><polygon points=\"" + o.map(function(i) { return i.join(","); }).join(" ") + "\" /></svg>";
      break;
    }
    case Q.ELLIPSE: {
      var n = e.geometry;
      t = "<svg><ellipse cx=\"" + n.cx + "\" cy=\"" + n.cy + "\" rx=\"" + n.rx + "\" ry=\"" + n.ry + "\" /></svg>";
      break;
    }
    case Q.MULTIPOLYGON: {
      var n = e.geometry;
      t = "<svg>" + Si(n) + "</svg>";
      break;
    }
    case Q.LINE: {
      var n = e.geometry,
          _a = n.points,
          _b = _a[0],
          o = _b[0],
          i = _b[1],
          _c = _a[1],
          s = _c[0],
          r = _c[1];
      t = "<svg><line x1=\"" + o + "\" y1=\"" + i + "\" x2=\"" + s + "\" y2=\"" + r + "\" /></svg>";
      break;
    }
    case Q.POLYLINE:
      t = "<svg><path d=\"" + Ct(e.geometry) + "\" /></svg>";
      break;
  }
  if (t) return { type: "SvgSelector", value: t };
  throw "Unsupported shape type: " + e.type;
};

// precomputed hex array for UUID generation
var me = [];
for (var e = 0; e < 256; ++e) me.push((e + 256).toString(16).slice(1));

function Ai(e, t) {
  if (t === void 0) t = 0;
  return (
    me[e[t + 0]] + me[e[t + 1]] + me[e[t + 2]] + me[e[t + 3]] + "-" +
    me[e[t + 4]] + me[e[t + 5]] + "-" +
    me[e[t + 6]] + me[e[t + 7]] + "-" +
    me[e[t + 8]] + me[e[t + 9]] + "-" +
    me[e[t + 10]] + me[e[t + 11]] + me[e[t + 12]] + me[e[t + 13]] + me[e[t + 14]] + me[e[t + 15]]
  ).toLowerCase();
}

var Ot;
var ki = new Uint8Array(16);

function Mi() {
  if (!Ot) {
    if (typeof crypto > "u" || !crypto.getRandomValues)
      throw new Error(
        "crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported"
      );
    Ot = crypto.getRandomValues.bind(crypto);
  }
  return Ot(ki);
}

var Dn = { randomUUID: typeof crypto < "u" && crypto.randomUUID && crypto.randomUUID.bind(crypto) };

function Ti(e, t, n) {
  var i;
  e = e || {};
  var o = e.random ?? ((i = e.rng) == null ? void 0 : i.call(e)) ?? Mi();
  if (o.length < 16) throw new Error("Random bytes length must be >= 16");
  o[6] = (o[6] & 15) | 64;
  o[8] = (o[8] & 63) | 128;
  return Ai(o);
}

function Bn(e, t, n) {
  return Dn.randomUUID && !e ? Dn.randomUUID() : Ti(e);
}
var Me = [], Be = 0;
var pt = 4;

var Dt = function(e) {
  var t = [];
  var n = {
    get: function() {
      return (n.lc || n.listen(function() {})(), n.value);
    },
    lc: 0,
    listen: function(o) {
      n.lc = t.push(o);
      return function() {
        for (var s = Be + pt; s < Me.length;) {
          if (Me[s] === o) Me.splice(s, pt);
          else s += pt;
        }
        var i = t.indexOf(o);
        if (~i) {
          t.splice(i, 1);
          --n.lc || n.off();
        }
      };
    },
    notify: function(o, i) {
      var s = !Me.length;
      for (var r of t) Me.push(r, n.value, o, i);
      if (s) {
        for (Be = 0; Be < Me.length; Be += pt) Me[Be](Me[Be + 1], Me[Be + 2], Me[Be + 3]);
        Me.length = 0;
      }
    },
    off: function() {},
    set: function(o) {
      var i = n.value;
      if (i !== o) {
        n.value = o;
        n.notify(i);
      }
    },
    subscribe: function(o) {
      var i = n.listen(o);
      o(n.value);
      return i;
    },
    value: e
  };
  return n;
};

var Pi = function(e) {
  var t = Dt(null);
  e.observe(function(_a) {
    var n = _a.changes;
    var o = t.get();
    if (o) {
      if ((n.deleted || []).some(function(s) { return s.id === o; })) t.set(null);
      var i = (n.updated || []).find(function(s) { return s.oldValue.id === o; });
      if (i) t.set(i.newValue.id);
    }
  });
  return {
    get current() { return t.get(); },
    subscribe: t.subscribe.bind(t),
    set: t.set.bind(t)
  };
};

var Bt = (function(e) {
  e.EDIT = "EDIT";
  e.SELECT = "SELECT";
  e.NONE = "NONE";
  return e;
})(Bt || {});

var Nt = { selected: [] };

var Li = function(e, t, n) {
  var o = Dt(Nt);
  var i = t;

  var s = function() {
    if (!De(o.get(), Nt)) o.set(Nt);
  };

  var r = function() {
    var g = o.get();
    return !g.selected || g.selected.length === 0;
  };

  var l = function(g) {
    if (r()) return false;
    var m = typeof g === "string" ? g : g.id;
    return o.get().selected.some(function(p) { return p.id === m; });
  };

  var a = function(g, m) {
    var p;
    if (Array.isArray(g)) {
      p = g.map(function(b) { return e.getAnnotation(b); }).filter(Boolean);
      if (p.length < g.length) {
        console.warn("Invalid selection: " + g.filter(function(b) { return !p.some(function(S) { return S.id === b; }); }));
        return;
      }
    } else {
      var b = e.getAnnotation(g);
      if (!b) {
        console.warn("Invalid selection: " + g);
        return;
      }
      p = [b];
    }

    var k = p.reduce(function(b, S) {
      var w = h(S);
      if (w === "EDIT") return b.concat([{ id: S.id, editable: true }]);
      if (w === "SELECT") return b.concat([{ id: S.id }]);
      return b;
    }, []);

    o.set({ selected: k, event: m });
  };

  var u = function(g, m) {
    var p = Array.isArray(g) ? g : [g];
    var k = p.map(function(b) { return e.getAnnotation(b); }).filter(Boolean);
    o.set({
      selected: k.map(function(b) {
        var S = m === undefined ? h(b) === "EDIT" : m;
        return { id: b.id, editable: S };
      })
    });
    if (k.length !== p.length) console.warn("Invalid selection", g);
  };

  var d = function(g) {
    if (r()) return false;
    var m = o.get().selected;
    if (m.some(function(p) { return g.includes(p.id); }))
      o.set({ selected: m.filter(function(p) { return !g.includes(p.id); }) });
  };

  var f = function(g) {
    i = g;
    u(o.get().selected.map(function(m) { return m.id; }));
  };

  var h = function(g) {
    return Ii(g, i, n);
  };

  e.observe(function(_a) {
    var g = _a.changes;
    d((g.deleted || []).map(function(m) { return m.id; }));
  });

  return {
    get event() { return o.get() ? o.get().event : null; },
    get selected() { return o.get() ? o.get().selected.slice() : null; },
    get userSelectAction() { return i; },
    clear: s,
    evalSelectAction: h,
    isEmpty: r,
    isSelected: l,
    setSelected: u,
    setUserSelectAction: f,
    subscribe: o.subscribe.bind(o),
    userSelect: a
  };
};

var Ii = function(e, t, n) {
  var o = n ? n.serialize(e) : e;
  return typeof t === "function" ? t(o) : t || "EDIT";
};

// Hex lookup for UUID
var pe = [];
for (var e = 0; e < 256; ++e) pe.push((e + 256).toString(16).slice(1));

// Convert 16-byte array to UUID string
function Ci(e, t) {
  if (t === void 0) t = 0;
  return (
    pe[e[t + 0]] + pe[e[t + 1]] + pe[e[t + 2]] + pe[e[t + 3]] + "-" +
    pe[e[t + 4]] + pe[e[t + 5]] + "-" +
    pe[e[t + 6]] + pe[e[t + 7]] + "-" +
    pe[e[t + 8]] + pe[e[t + 9]] + "-" +
    pe[e[t + 10]] + pe[e[t + 11]] + pe[e[t + 12]] + pe[e[t + 13]] + pe[e[t + 14]] + pe[e[t + 15]]
  ).toLowerCase();
}

// Random bytes array
var Ut;
var Oi = new Uint8Array(16);

// Get random bytes (browser crypto)
function Di() {
  if (!Ut) {
    if (typeof crypto === "undefined" || !crypto.getRandomValues)
      throw new Error("crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported");
    Ut = crypto.getRandomValues.bind(crypto);
  }
  return Ut(Oi);
}

// Native crypto UUID support
var Bi = (typeof crypto !== "undefined" && crypto.randomUUID && crypto.randomUUID.bind(crypto));
var Un = { randomUUID: Bi };

// Generate random UUID (v4)
function Ni(e) {
  e = e || {};
  var o = e.random ?? (e.rng ? e.rng() : undefined) ?? Di();
  if (o.length < 16) throw new Error("Random bytes length must be >= 16");

  o[6] = (o[6] & 15) | 64; // Version 4
  o[8] = (o[8] & 63) | 128; // Variant
  return Ci(o);
}

// Use native crypto.randomUUID if available
function Yn(e) {
  return Un.randomUUID && !e ? Un.randomUUID() : Ni(e);
}

// Convert plain object dates to Date instances
var Yt = function(e) {
  var t = function(n) {
    var o = Object.assign({}, n);
    if (n.created && typeof n.created === "string") o.created = new Date(n.created);
    if (n.updated && typeof n.updated === "string") o.updated = new Date(n.updated);
    return o;
  };
  return t(e);
};
// Deep equality check
var Nn = Object.prototype.hasOwnProperty;
function De(e, t) {
  var n, o;
  if (e === t) return true;
  if (e && t && (n = e.constructor) === t.constructor) {
    if (n === Date) return e.getTime() === t.getTime();
    if (n === RegExp) return e.toString() === t.toString();
    if (n === Array) {
      if ((o = e.length) === t.length) {
        for (; o-- && De(e[o], t[o]); );
      }
      return o === -1;
    }
    if (!n || typeof e === "object") {
      o = 0;
      for (n in e) {
        if (Nn.call(e, n)) {
          ++o;
          if (!Nn.call(t, n) || !De(e[n], t[n])) return false;
        }
      }
      return Object.keys(t).length === o;
    }
  }
  return e !== e && t !== t; // NaN check
}

// Reactive state
var Me = [], Be = 0, pt = 4;
function Dt(e) {
  var t = [];
  var n = {
    value: e,
    lc: 0,
    get: function() {
      return (n.lc || n.listen(function() {})(), n.value);
    },
    listen: function(o) {
      n.lc = t.push(o);
      return function() {
        for (var s = Be + pt; s < Me.length; ) {
          if (Me[s] === o) Me.splice(s, pt); else s += pt;
        }
        var i = t.indexOf(o);
        if (~i) {
          t.splice(i, 1);
          if (--n.lc === 0) n.off();
        }
      };
    },
    notify: function(o, i) {
      var s = Me.length === 0;
      for (var r = 0; r < t.length; r++) Me.push(t[r], n.value, o, i);
      if (s) {
        for (Be = 0; Be < Me.length; Be += pt) {
          Me[Be](Me[Be + 1], Me[Be + 2], Me[Be + 3]);
        }
        Me.length = 0;
      }
    },
    off: function() {},
    set: function(o) {
      var i = n.value;
      if (i !== o) {
        n.value = o;
        n.notify(i);
      }
    },
    subscribe: function(o) {
      var i = n.listen(o);
      o(n.value);
      return i;
    }
  };
  return n;
}

// Simple annotation wrapper
var Pi = function(e) {
  var t = Dt(null);
  e.observe(function(change) {
    var n = t.get();
    if (n) {
      if ((change.changes.deleted || []).some(function(d) { return d.id === n; })) t.set(null);
      var updated = (change.changes.updated || []).find(function(u) { return u.oldValue.id === n; });
      if (updated) t.set(updated.newValue.id);
    }
  });
  return {
    get current() {
      return t.get();
    },
    subscribe: t.subscribe.bind(t),
    set: t.set.bind(t)
  };
};

// Selection state
var Bt = (function(e) { e.EDIT = "EDIT"; e.SELECT = "SELECT"; e.NONE = "NONE"; return e; })(Bt || {});
var Nt = { selected: [] };

// Selection manager
function Li(e, t, n) {
  var o = Dt(Nt);
  var i = t;

  function s() { if (!De(o.get(), Nt)) o.set(Nt); }
  function r() { var g = o.get(); return !g || (g.selected || []).length === 0; }
  function l(g) {
    if (r()) return false;
    var m = typeof g === "string" ? g : g.id;
    return o.get().selected.some(function(p) { return p.id === m; });
  }
  function a(g, m) {
    var p;
    if (Array.isArray(g)) {
      p = g.map(function(b) { return e.getAnnotation(b); }).filter(Boolean);
      if (p.length < g.length) {
        console.warn("Invalid selection: " + g.filter(function(b) { return !p.some(function(S) { return S.id === b; }); }));
        return;
      }
    } else {
      var b = e.getAnnotation(g);
      if (!b) { console.warn("Invalid selection: " + g); return; }
      p = [b];
    }
    var k = p.reduce(function(b, S) {
      var w = h(S);
      if (w === "EDIT") return b.concat([{ id: S.id, editable: true }]);
      if (w === "SELECT") return b.concat([{ id: S.id }]);
      return b;
    }, []);
    o.set({ selected: k, event: m });
  }
  function u(g, m) {
    var p = Array.isArray(g) ? g : [g];
    var k = p.map(function(b) { return e.getAnnotation(b); }).filter(Boolean);
    o.set({
      selected: k.map(function(b) {
        var S = m === undefined ? h(b) === "EDIT" : m;
        return { id: b.id, editable: S };
      })
    });
    if (k.length !== p.length) console.warn("Invalid selection", g);
  }
  function d(g) {
    if (r()) return false;
    var m = o.get().selected;
    if (m.some(function(p) { return g.includes(p.id); })) {
      o.set({ selected: m.filter(function(p) { return !g.includes(p.id); }) });
    }
  }
  function f(g) {
    i = g;
    u(o.get().selected.map(function(x) { return x.id; }));
  }
  function h(g) { return Ii(g, i, n); }

  e.observe(function(change) { d((change.changes.deleted || []).map(function(x) { return x.id; })); });

  return {
    get event() { return o.get() ? o.get().event : null; },
    get selected() { return o.get() ? o.get().selected.slice() : null; },
    get userSelectAction() { return i; },
    clear: s,
    evalSelectAction: h,
    isEmpty: r,
    isSelected: l,
    setSelected: u,
    setUserSelectAction: f,
    subscribe: o.subscribe.bind(o),
    userSelect: a
  };
},pe = [];
for (let e = 0; e < 256; ++e) {
  pe.push((e + 256).toString(16).slice(1));
}

function Ci(e, t = 0) {
  return (
    pe[e[t + 0]] +
    pe[e[t + 1]] +
    pe[e[t + 2]] +
    pe[e[t + 3]] +
    "-" +
    pe[e[t + 4]] +
    pe[e[t + 5]] +
    "-" +
    pe[e[t + 6]] +
    pe[e[t + 7]] +
    "-" +
    pe[e[t + 8]] +
    pe[e[t + 9]] +
    "-" +
    pe[e[t + 10]] +
    pe[e[t + 11]] +
    pe[e[t + 12]] +
    pe[e[t + 13]] +
    pe[e[t + 14]] +
    pe[e[t + 15]]
  ).toLowerCase();
}

let Ut;
const Oi = new Uint8Array(16);

function Di() {
  if (!Ut) {
    if (typeof crypto === "undefined" || !crypto.getRandomValues) {
      throw new Error(
        "crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported"
      );
    }
    Ut = crypto.getRandomValues.bind(crypto);
  }
  return Ut(Oi);
}

const Bi =
  typeof crypto !== "undefined" &&
  crypto.randomUUID &&
  crypto.randomUUID.bind(crypto);

const Un = { randomUUID: Bi };

function Ni(e) {
  e = e || {};
  const i =
    e.random ||
    (e.rng ? e.rng() : undefined) ||
    Di();

  if (i.length < 16) {
    throw new Error("Random bytes length must be >= 16");
  }

  i[6] = (i[6] & 15) | 64;   // Version 4
  i[8] = (i[8] & 63) | 128;  // Variant

  return Ci(i);
}

function Yn(e) {
  return Un.randomUUID && !e ? Un.randomUUID() : Ni(e);
}

const Yt = function(e) {
  const wrap = function(n) {
    const o = Object.assign({}, n);
    if (n.created && typeof n.created === "string") o.created = new Date(n.created);
    if (n.updated && typeof n.updated === "string") o.updated = new Date(n.updated);
    return o;
  };

  return Object.assign({}, e, {
    bodies: (e.bodies || []).map(wrap),
    target: wrap(e.target)
  });
};

Ui = function(e, t, n, o) {
  return {
    id: Yn(),
    annotation: typeof e === "string" ? e : e.id,
    created: n || new Date(),
    creator: o,
    ...t
  };
};

// (REST OF BLOCK IS VALID AND NEEDS NO STRING FIXES)
,
    Yi = (e, t) => {
      const n = new Set(e.bodies.map((o) => o.id));
      return t.bodies.filter((o) => !n.has(o.id));
    },
    Ri = (e, t) => {
      const n = new Set(t.bodies.map((o) => o.id));
      return e.bodies.filter((o) => !n.has(o.id));
    },
    Vi = (e, t) =>
      t.bodies
        .map((n) => {
          const o = e.bodies.find((i) => i.id === n.id);
          return { newBody: n, oldBody: o && !De(o, n) ? o : void 0 };
        })
        .filter(({ oldBody: n }) => n)
        .map(({ oldBody: n, newBody: o }) => ({ oldBody: n, newBody: o })),
    Xi = (e, t) => !De(e.target, t.target),
    Rn = (e, t) => {
      const n = Yi(e, t),
        o = Ri(e, t),
        i = Vi(e, t);
      return {
        oldValue: e,
        newValue: t,
        bodiesCreated: n.length > 0 ? n : void 0,
        bodiesDeleted: o.length > 0 ? o : void 0,
        bodiesUpdated: i.length > 0 ? i : void 0,
        targetUpdated: Xi(e, t)
          ? { oldTarget: e.target, newTarget: t.target }
          : void 0,
      };
    };
  var ne = ((e) => (
    (e.LOCAL = "LOCAL"),
    (e.REMOTE = "REMOTE"),
    (e.SILENT = "SILENT"),
    e
  ))(ne || {});
  const Hi = (e, t) => {
      var n, o;
      const { changes: i, origin: s } = t;
      if (!(e.options.origin ? e.options.origin === s : s !== "SILENT"))
        return !1;
      if (e.options.ignore) {
        const { ignore: r } = e.options,
          l = (a) => a && a.length > 0;
        if (!(l(i.created) || l(i.deleted))) {
          const a =
              (n = i.updated) == null
                ? void 0
                : n.some(
                    (d) =>
                      l(d.bodiesCreated) ||
                      l(d.bodiesDeleted) ||
                      l(d.bodiesUpdated),
                  ),
            u =
              (o = i.updated) == null ? void 0 : o.some((d) => d.targetUpdated);
          if (
            (r === "BODY_ONLY" && a && !u) ||
            (r === "TARGET_ONLY" && u && !a)
          )
            return !1;
        }
      }
      if (e.options.annotations) {
        const r = new Set([
          ...(i.created || []).map((l) => l.id),
          ...(i.deleted || []).map((l) => l.id),
          ...(i.updated || []).map(({ oldValue: l }) => l.id),
        ]);
        return !!(
          Array.isArray(e.options.annotations)
            ? e.options.annotations
            : [e.options.annotations]
        ).find((l) => r.has(l));
      } else return !0;
    },
    Gi = (e, t) => {
      const n = new Set((e.created || []).map((f) => f.id)),
        o = new Set((e.updated || []).map(({ newValue: f }) => f.id)),
        i = new Set((t.created || []).map((f) => f.id)),
        s = new Set((t.deleted || []).map((f) => f.id)),
        r = new Set((t.updated || []).map(({ oldValue: f }) => f.id)),
        l = new Set(
          (t.updated || [])
            .filter(({ oldValue: f }) => n.has(f.id) || o.has(f.id))
            .map(({ oldValue: f }) => f.id),
        ),
        a = [
          ...(e.created || [])
            .filter((f) => !s.has(f.id))
            .map((f) =>
              r.has(f.id)
                ? t.updated.find(({ oldValue: h }) => h.id === f.id).newValue
                : f,
            ),
          ...(t.created || []),
        ],
        u = [
          ...(e.deleted || []).filter((f) => !i.has(f.id)),
          ...(t.deleted || []).filter((f) => !n.has(f.id)),
        ],
        d = [
          ...(e.updated || [])
            .filter(({ newValue: f }) => !s.has(f.id))
            .map((f) => {
              const { oldValue: h, newValue: g } = f;
              if (r.has(g.id)) {
                const m = t.updated.find(
                  (p) => p.oldValue.id === g.id,
                ).newValue;
                return Rn(h, m);
              } else return f;
            }),
          ...(t.updated || []).filter(({ oldValue: f }) => !l.has(f.id)),
        ];
      return { created: a, deleted: u, updated: d };
    },
    yt = (e) => {
      const t = e.id === void 0 ? Yn() : e.id;
      return {
        ...e,
        id: t,
        bodies:
          e.bodies === void 0
            ? []
            : e.bodies.map((n) => ({ ...n, annotation: t })),
        target: { ...e.target, annotation: t },
      };
    },
    ji = (e) => e.id !== void 0,
    Fi = () => {
      const e = new Map(),
        t = new Map(),
        n = [],
        o = (_, v = {}) => {
          n.push({ onChange: _, options: v });
        },
        i = (_) => {
          const v = n.findIndex((y) => y.onChange == _);
          v > -1 && n.splice(v, 1);
        },
        s = (_, v) => {
          const y = {
            origin: _,
            changes: {
              created: v.created || [],
              updated: v.updated || [],
              deleted: v.deleted || [],
            },
            state: [...e.values()],
          };
          n.forEach((E) => {
            Hi(E, y) && E.onChange(y);
          });
        },
        r = (_, v = ne.LOCAL) => {
          if (_.id && e.get(_.id))
            throw Error("Cannot add annotation" + _.id "- exists already");
          {
            const y = yt(_);
            (e.set(y.id, y),
              y.bodies.forEach((E) => t.set(E.id, y.id)),
              s(v, { created: [y] }));
          }
        },
        l = (_, v) => {
          const y = yt(typeof _ == "string" ? v : _),
            E = typeof _ == "string" ? _ : _.id,
            I = E && e.get(E);
          if (I) {
            const P = Rn(I, y);
            return (
              E === y.id ? e.set(E, y) : (e.delete(E), e.set(y.id, y)),
              I.bodies.forEach((D) => t.delete(D.id)),
              y.bodies.forEach((D) => t.set(D.id, y.id)),
              P
            );
          } else console.warn("Cannot update annotation" +  E "- does not exist");
        },
        a = (_, v = ne.LOCAL, y = ne.LOCAL) => {
          const E = ji(v) ? y : v,
            I = l(_, v);
          I && s(E, { updated: [I] });
        },
        u = (_, v = ne.LOCAL) => {
          e.get(_.id) ? a(_, v) : r(_, v);
        },
        d = (_, v = ne.LOCAL) => {
          const y = _.reduce((E, I) => {
            const P = l(I);
            return P ? [...E, P] : E;
          }, []);
          y.length > 0 && s(v, { updated: y });
        },
        f = (_, v = ne.LOCAL) => {
          const y = _.map(yt),
            { toAdd: E, toUpdate: I } = y.reduce(
              (D, F) =>
                e.get(F.id)
                  ? { ...D, toUpdate: [...D.toUpdate, F] }
                  : { ...D, toAdd: [...D.toAdd, F] },
              { toAdd: [], toUpdate: [] },
            ),
            P = I.map((D) => l(D, v)).filter(Boolean);
          (E.forEach((D) => {
            (e.set(D.id, D), D.bodies.forEach((F) => t.set(F.id, D.id)));
          }),
            s(v, { created: E, updated: P }));
        },
        h = (_, v = ne.LOCAL) => {
          const y = e.get(_.annotation);
          if (y) {
            const E = { ...y, bodies: [...y.bodies, _] };
            (e.set(y.id, E),
              t.set(_.id, E.id),
              s(v, {
                updated: [{ oldValue: y, newValue: E, bodiesCreated: [_] }],
              }));
          } else
            console.warn(
              "Attempt to add body to missing annotation:" + _.annotation"},
            );
        },
        g = () => [...e.values()],
        m = (_ = ne.LOCAL) => {
          const v = [...e.values()];
          (e.clear(), t.clear(), s(_, { deleted: v }));
        },
        p = (_, v = !0, y = ne.LOCAL) => {
          const E = _.map(yt);
          if (v) {
            const I = [...e.values()];
            (e.clear(),
              t.clear(),
              E.forEach((P) => {
                (e.set(P.id, P), P.bodies.forEach((D) => t.set(D.id, P.id)));
              }),
              s(y, { created: E, deleted: I }));
          } else {
            const I = _.reduce((P, D) => {
              const F = D.id && e.get(D.id);
              return F ? [...P, F] : P;
            }, []);
            if (I.length > 0)
              throw Error(
                "Bulk insert would overwrite the following annotations.",
              );
            (E.forEach((P) => {
              (e.set(P.id, P), P.bodies.forEach((D) => t.set(D.id, P.id)));
            }),
              s(y, { created: E }));
          }
        },
        k = (_) => {
          const v = typeof _ == "string" ? _ : _.id,
            y = e.get(v);
          if (y)
            return (e.delete(v), y.bodies.forEach((E) => t.delete(E.id)), y);
          console.warn("Attempt to delete missing annotation" +v);
        },
        b = (_, v = ne.LOCAL) => {
          const y = k(_);
          y && s(v, { deleted: [y] });
        },
        S = (_, v = ne.LOCAL) => {
          const y = _.reduce((E, I) => {
            const P = k(I);
            return P ? [...E, P] : E;
          }, []);
          y.length > 0 && s(v, { deleted: y });
        },
        w = (_) => {
          const v = e.get(_.annotation);
          if (v) {
            const y = v.bodies.find((E) => E.id === _.id);
            if (y) {
              t.delete(y.id);
              const E = { ...v, bodies: v.bodies.filter((I) => I.id !== _.id) };
              return (
                e.set(v.id, E),
                { oldValue: v, newValue: E, bodiesDeleted: [y] }
              );
            } else
              console.warn(
                "Attempt to delete missing body + _.id + "from annotation" + _.annotation},
              );
          } else
            console.warn(
              "Attempt to delete body from missing annotation " + _.annotation
            );
        },
        A = (_, v = ne.LOCAL) => {
          const y = w(_);
          y && s(v, { updated: [y] });
        },
        T = (_, v = ne.LOCAL) => {
          const y = _.map((E) => w(E)).filter(Boolean);
          y.length > 0 && s(v, { updated: y });
        },
        C = (_) => {
          const v = e.get(_);
          return v ? { ...v } : void 0;
        },
        M = (_) => {
          const v = t.get(_);
          if (v) {
            const y = C(v).bodies.find((E) => E.id === _);
            if (y) return y;
            console.error(
              "Store integrity error: body " + _ + "in index, but not in annotation",
            );
          } else console.warn("Attempt to retrieve missing body: " + _);
        },
        V = (_, v) => {
          if (_.annotation !== v.annotation)
            throw "Annotation integrity violation: annotation ID must be the same when updating bodies";
          const y = e.get(_.annotation);
          if (y) {
            const E = y.bodies.find((P) => P.id === _.id),
              I = {
                ...y,
                bodies: y.bodies.map((P) => (P.id === E.id ? v : P)),
              };
            return (
              e.set(y.id, I),
              E.id !== v.id && (t.delete(E.id), t.set(v.id, I.id)),
              {
                oldValue: y,
                newValue: I,
                bodiesUpdated: [{ oldBody: E, newBody: v }],
              }
            );
          } else
            console.warn(
              "Attempt to add body to missing annotation" + _.annotation
            );
        },
        U = (_, v, y = ne.LOCAL) => {
          const E = V(_, v);
          E && s(y, { updated: [E] });
        },
        W = (_, v = ne.LOCAL) => {
          const y = _.map((E) =>
            V({ id: E.id, annotation: E.annotation }, E),
          ).filter(Boolean);
          s(v, { updated: y });
        },
        q = (_) => {
          const v = e.get(_.annotation);
          if (v) {
            const y = { ...v, target: { ...v.target, ..._ } };
            return (
              e.set(v.id, y),
              {
                oldValue: v,
                newValue: y,
                targetUpdated: { oldTarget: v.target, newTarget: _ },
              }
            );
          } else
            console.warn(
              "Attempt to update target on missing annotation: " +  _.annotation
            );
        };

// Evaluate select action
    Ii = (e, t, n) => {
      const o = n ? n.serialize(e) : e;
      return typeof t == "function" ? t(o) : t || "EDIT";
    },
    pe = [];
  for (let e = 0; e < 256; ++e) pe.push((e + 256).toString(16).slice(1));
  function Ci(e, t = 0) {
    return (
      pe[e[t + 0]] +
      pe[e[t + 1]] +
      pe[e[t + 2]] +
      pe[e[t + 3]] +
      "-" +
      pe[e[t + 4]] +
      pe[e[t + 5]] +
      "-" +
      pe[e[t + 6]] +
      pe[e[t + 7]] +
      "-" +
      pe[e[t + 8]] +
      pe[e[t + 9]] +
      "-" +
      pe[e[t + 10]] +
      pe[e[t + 11]] +
      pe[e[t + 12]] +
      pe[e[t + 13]] +
      pe[e[t + 14]] +
      pe[e[t + 15]]
    ).toLowerCase();
  }
  let Ut;
  const Oi = new Uint8Array(16);
  function Di() {
    if (!Ut) {
      if (typeof crypto > "u" || !crypto.getRandomValues)
        throw new Error(
          "crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported",
        );
      Ut = crypto.getRandomValues.bind(crypto);
    }
    return Ut(Oi);
  }
    const Bi =
      typeof crypto < "u" &&
      crypto.randomUUID &&
      crypto.randomUUID.bind(crypto),
    Un = { randomUUID: Bi };
  function Ni(e, t, n) {
    var o;
    e = e || {};
    const i = e.random ?? ((o = e.rng) == null ? void 0 : o.call(e)) ?? Di();
    if (i.length < 16) throw new Error("Random bytes length must be >= 16");
    return ((i[6] = (i[6] & 15) | 64), (i[8] = (i[8] & 63) | 128), Ci(i));
  }
  function Yn(e, t, n) {
    return Un.randomUUID && !e ? Un.randomUUID() : Ni(e);
  }
  const Yt = (e) => {
      const t = (n) => {
        const o = { ...n };
        return (
          n.created &&
            typeof n.created == "string" &&
            (o.created = new Date(n.created)),
          n.updated &&
            typeof n.updated == "string" &&
            (o.updated = new Date(n.updated)),
          o
        );
      };
      return { ...e, bodies: (e.bodies || []).map(t), target: t(e.target) };
    },
    Ui = (e, t, n, o) => ({
      id: Yn(),
      annotation: typeof e == "string" ? e : e.id,
      created: n || new Date(),
      creator: o,
      ...t,
    }),
    Yi = (e, t) => {
      const n = new Set(e.bodies.map((o) => o.id));
      return t.bodies.filter((o) => !n.has(o.id));
    },
    Ri = (e, t) => {
      const n = new Set(t.bodies.map((o) => o.id));
      return e.bodies.filter((o) => !n.has(o.id));
    },
    Vi = (e, t) =>
      t.bodies
        .map((n) => {
          const o = e.bodies.find((i) => i.id === n.id);
          return { newBody: n, oldBody: o && !De(o, n) ? o : void 0 };
        })
        .filter(({ oldBody: n }) => n)
        .map(({ oldBody: n, newBody: o }) => ({ oldBody: n, newBody: o })),
    Xi = (e, t) => !De(e.target, t.target),
    Rn = (e, t) => {
      const n = Yi(e, t),
        o = Ri(e, t),
        i = Vi(e, t);
      return {
        oldValue: e,
        newValue: t,
        bodiesCreated: n.length > 0 ? n : void 0,
        bodiesDeleted: o.length > 0 ? o : void 0,
        bodiesUpdated: i.length > 0 ? i : void 0,
        targetUpdated: Xi(e, t)
          ? { oldTarget: e.target, newTarget: t.target }
          : void 0,
      };
    };
      var ne = ((e) => (
    (e.LOCAL = "LOCAL"),
    (e.REMOTE = "REMOTE"),
    (e.SILENT = "SILENT"),
    e
  ))(ne || {});
  const Hi = (e, t) => {
      var n, o;
      const { changes: i, origin: s } = t;
      if (!(e.options.origin ? e.options.origin === s : s !== "SILENT"))
        return !1;
      if (e.options.ignore) {
        const { ignore: r } = e.options,
          l = (a) => a && a.length > 0;
        if (!(l(i.created) || l(i.deleted))) {
          const a =
              (n = i.updated) == null
                ? void 0
                : n.some(
                    (d) =>
                      l(d.bodiesCreated) ||
                      l(d.bodiesDeleted) ||
                      l(d.bodiesUpdated),
                  ),
            u =
              (o = i.updated) == null ? void 0 : o.some((d) => d.targetUpdated);
          if (
            (r === "BODY_ONLY" && a && !u) ||
            (r === "TARGET_ONLY" && u && !a)
          )
            return !1;
        }
      }
        if (e.options.annotations) {
        const r = new Set([
          ...(i.created || []).map((l) => l.id),
          ...(i.deleted || []).map((l) => l.id),
          ...(i.updated || []).map(({ oldValue: l }) => l.id),
        ]);
        return !!(
          Array.isArray(e.options.annotations)
            ? e.options.annotations
            : [e.options.annotations]
        ).find((l) => r.has(l));
      } else return !0;
    },
    Gi = (e, t) => {
      const n = new Set((e.created || []).map((f) => f.id)),
        o = new Set((e.updated || []).map(({ newValue: f }) => f.id)),
        i = new Set((t.created || []).map((f) => f.id)),
        s = new Set((t.deleted || []).map((f) => f.id)),
        r = new Set((t.updated || []).map(({ oldValue: f }) => f.id)),
        l = new Set(
          (t.updated || [])
            .filter(({ oldValue: f }) => n.has(f.id) || o.has(f.id))
            .map(({ oldValue: f }) => f.id),
        ),
        a = [
          ...(e.created || [])
            .filter((f) => !s.has(f.id))
            .map((f) =>
              r.has(f.id)
                ? t.updated.find(({ oldValue: h }) => h.id === f.id).newValue
                : f,
            ),
          ...(t.created || []),
        ],
        u = [
          ...(e.deleted || []).filter((f) => !i.has(f.id)),
          ...(t.deleted || []).filter((f) => !n.has(f.id)),
        ],
        d = [
          ...(e.updated || [])
            .filter(({ newValue: f }) => !s.has(f.id))
            .map((f) => {
              const { oldValue: h, newValue: g } = f;
              if (r.has(g.id)) {
                const m = t.updated.find(
                  (p) => p.oldValue.id === g.id,
                ).newValue;
                return Rn(h, m);
              } else return f;
            }),
          ...(t.updated || []).filter(({ oldValue: f }) => !l.has(f.id)),
        ];
      return { created: a, deleted: u, updated: d };
    },
    yt = (e) => {
      const t = e.id === void 0 ? Yn() : e.id;
      return {
        ...e,
        id: t,
        bodies:
          e.bodies === void 0
            ? []
            : e.bodies.map((n) => ({ ...n, annotation: t })),
        target: { ...e.target, annotation: t },
      };
    },
    ji = (e) => e.id !== void 0,
    Fi = () => {
      const e = new Map(),
        t = new Map(),
        n = [],
        o = (_, v = {}) => {
          n.push({ onChange: _, options: v });
        },
        i = (_) => {
          const v = n.findIndex((y) => y.onChange == _);
          v > -1 && n.splice(v, 1);
        },
        s = (_, v) => {
          const y = {
            origin: _,
            changes: {
              created: v.created || [],
              updated: v.updated || [],
              deleted: v.deleted || [],
            },
            state: [...e.values()],
          };
          n.forEach((E) => {
            Hi(E, y) && E.onChange(y);
          });
        },
        r = (_, v = ne.LOCAL) => {
          if (_.id && e.get(_.id))
            throw Error("Cannot add annotation" +  _.id + " - exists already");
          {
            const y = yt(_);
            (e.set(y.id, y),
              y.bodies.forEach((E) => t.set(E.id, y.id)),
              s(v, { created: [y] }));
          }
        },
        l = (_, v) => {
          const y = yt(typeof _ == "string" ? v : _),
            E = typeof _ == "string" ? _ : _.id,
            I = E && e.get(E);
          if (I) {
            const P = Rn(I, y);
            return (
              E === y.id ? e.set(E, y) : (e.delete(E), e.set(y.id, y)),
              I.bodies.forEach((D) => t.delete(D.id)),
              y.bodies.forEach((D) => t.set(D.id, y.id)),
              P
            );
          } else console.warn("Cannot update annotation " + E " - does not exist");
        },
        a = (_, v = ne.LOCAL, y = ne.LOCAL) => {
          const E = ji(v) ? y : v,
            I = l(_, v);
          I && s(E, { updated: [I] });
        },
        u = (_, v = ne.LOCAL) => {
          e.get(_.id) ? a(_, v) : r(_, v);
        },
        d = (_, v = ne.LOCAL) => {
          const y = _.reduce((E, I) => {
            const P = l(I);
            return P ? [...E, P] : E;
          }, []);
          y.length > 0 && s(v, { updated: y });
        },
        f = (_, v = ne.LOCAL) => {
          const y = _.map(yt),
            { toAdd: E, toUpdate: I } = y.reduce(
              (D, F) =>
                e.get(F.id)
                  ? { ...D, toUpdate: [...D.toUpdate, F] }
                  : { ...D, toAdd: [...D.toAdd, F] },
              { toAdd: [], toUpdate: [] },
            ),
            P = I.map((D) => l(D, v)).filter(Boolean);
          (E.forEach((D) => {
            (e.set(D.id, D), D.bodies.forEach((F) => t.set(F.id, D.id)));
               }),
            s(v, { created: E, updated: P }));
        },
        h = (_, v = ne.LOCAL) => {
          const y = e.get(_.annotation);
          if (y) {
            const E = { ...y, bodies: [...y.bodies, _] };
            (e.set(y.id, E),
              t.set(_.id, E.id),
              s(v, {
                updated: [{ oldValue: y, newValue: E, bodiesCreated: [_] }],
              }));
          } else
            console.warn(
              "Attempt to add body to missing annotation: " + _.annotation",
            );
        },
        g = () => [...e.values()],
        m = (_ = ne.LOCAL) => {
          const v = [...e.values()];
          (e.clear(), t.clear(), s(_, { deleted: v }));
        },
        p = (_, v = !0, y = ne.LOCAL) => {
          const E = _.map(yt);
          if (v) {
            const I = [...e.values()];
            (e.clear(),
              t.clear(),
              E.forEach((P) => {
                (e.set(P.id, P), P.bodies.forEach((D) => t.set(D.id, P.id)));
              }),
              s(y, { created: E, deleted: I }));
          } else {
            const I = _.reduce((P, D) => {
              const F = D.id && e.get(D.id);
              return F ? [...P, F] : P;
            }, []);
            if (I.length > 0)
              throw Error(
                "Bulk insert would overwrite the following annotations: "  + I.map((P) => P.id).join(", ")},
              );
            (E.forEach((P) => {
              (e.set(P.id, P), P.bodies.forEach((D) => t.set(D.id, P.id)));
            }),
              s(y, { created: E }));
          }
        },
        k = (_) => {
          const v = typeof _ == "string" ? _ : _.id,
            y = e.get(v);
          if (y)
            return (e.delete(v), y.bodies.forEach((E) => t.delete(E.id)), y);
          console.warn("Attempt to delete missing annotation: " + v);
        },
        b = (_, v = ne.LOCAL) => {
          const y = k(_);
          y && s(v, { deleted: [y] });
        },
        S = (_, v = ne.LOCAL) => {
          const y = _.reduce((E, I) => {
            const P = k(I);
            return P ? [...E, P] : E;
          }, []);
          y.length > 0 && s(v, { deleted: y });
        },
        w = (_) => {
          const v = e.get(_.annotation);
          if (v) {
            const y = v.bodies.find((E) => E.id === _.id);
            if (y) {
              t.delete(y.id);
              const E = { ...v, bodies: v.bodies.filter((I) => I.id !== _.id) };
              return (
                e.set(v.id, E),
                { oldValue: v, newValue: E, bodiesDeleted: [y] }
              );
            } else
              console.warn(
                Attempt to delete missing body " +_.id + "from annotation "+_.annotation);
          } else
            console.warn(
              "Attempt to delete body from missing annotation" + _.annotation);
        },
        A = (_, v = ne.LOCAL) => {
          const y = w(_);
          y && s(v, { updated: [y] });
        },
        T = (_, v = ne.LOCAL) => {
          const y = _.map((E) => w(E)).filter(Boolean);
          y.length > 0 && s(v, { updated: y });
        },
        C = (_) => {
          const v = e.get(_);
          return v ? { ...v } : void 0;
        },
        M = (_) => {
          const v = t.get(_);
          if (v) {
            const y = C(v).bodies.find((E) => E.id === _);
            if (y) return y;
            console.error(
              "Store integrity error: body" +  _ + " in index, but not in annotation");
          } else console.warn("Attempt to retrieve missing body: " + _);
        },
        V = (_, v) => {
          if (_.annotation !== v.annotation)
            throw "Annotation integrity violation: annotation ID must be the same when updating bodies";
          const y = e.get(_.annotation);
          if (y) {
            const E = y.bodies.find((P) => P.id === _.id),
              I = {
                ...y,
                bodies: y.bodies.map((P) => (P.id === E.id ? v : P)),
              };
            return (
              e.set(y.id, I),
              E.id !== v.id && (t.delete(E.id), t.set(v.id, I.id)),
              {
                oldValue: y,
                newValue: I,
                bodiesUpdated: [{ oldBody: E, newBody: v }],
              }
            );
          } else
            console.warn(
              "Attempt to add body to missing annotation" + _.annotation);
        },
        U = (_, v, y = ne.LOCAL) => {
          const E = V(_, v);
          E && s(y, { updated: [E] });
        },
        W = (_, v = ne.LOCAL) => {
          const y = _.map((E) =>
            V({ id: E.id, annotation: E.annotation }, E),
          ).filter(Boolean);
          s(v, { updated: y });
        },
        q = (_) => {
          const v = e.get(_.annotation);
          if (v) {
            const y = { ...v, target: { ...v.target, ..._ } };
            return (
              e.set(v.id, y),
              {
                oldValue: v,
                newValue: y,
                targetUpdated: { oldTarget: v.target, newTarget: _ },
              }
            );
          } else
            console.warn(
              "Attempt to update target on missing annotation:" + _.annotation);
        };
      return {
        addAnnotation: r,
        addBody: h,
        all: g,
        bulkAddAnnotations: p,
        bulkDeleteAnnotations: S,
        bulkDeleteBodies: T,
        bulkUpdateAnnotations: d,
        bulkUpdateBodies: W,
        bulkUpdateTargets: (_, v = ne.LOCAL) => {
          const y = _.map((E) => q(E)).filter(Boolean);
          y.length > 0 && s(v, { updated: y });
        },
        bulkUpsertAnnotations: f,
        clear: m,
        deleteAnnotation: b,
        deleteBody: A,
        getAnnotation: C,
        getBody: M,
        observe: o,
        unobserve: i,
        updateAnnotation: a,
        updateBody: U,
        updateTarget: (_, v = ne.LOCAL) => {
          const y = q(_);
          y && s(v, { updated: [y] });
        },
        upsertAnnotation: u,
      };
    };
  let zi = () => ({
    emit(e, ...t) {
      for (let n = this.events[e] || [], o = 0, i = n.length; o < i; o++)
        n[o](...t);
    },
    events: {},
    on(e, t) {
      var n;
      return (
        ((n = this.events)[e] || (n[e] = [])).push(t),
        () => {
          var o;
          this.events[e] =
            (o = this.events[e]) == null ? void 0 : o.filter((i) => t !== i);
        }
      );
    },
  });
  const qi = 250,
    Ki = (e, t) => {
      const n = zi(),
        o = (t == null ? void 0 : t.changes) || [];
      let i = t ? t.pointer : -1,
        s = !1,
        r = 0;
      const l = (m) => {
        if (!s) {
          const { changes: p } = m,
            k = performance.now();
          if (k - r > qi) (o.splice(i + 1), o.push(p), (i = o.length - 1));
          else {
            const b = o.length - 1;
            o[b] = Gi(o[b], p);
          }
          r = k;
        }
        s = !1;
      };
      e.observe(l, { origin: ne.LOCAL });
      const a = (m) => m && m.length > 0 && e.bulkDeleteAnnotations(m),
        u = (m) => m && m.length > 0 && e.bulkAddAnnotations(m, !1),
        d = (m) =>
          m &&
          m.length > 0 &&
          e.bulkUpdateAnnotations(m.map(({ oldValue: p }) => p)),
        f = (m) =>
          m &&
          m.length > 0 &&
          e.bulkUpdateAnnotations(m.map(({ newValue: p }) => p)),
        h = (m) => m && m.length > 0 && e.bulkAddAnnotations(m, !1),
        g = (m) => m && m.length > 0 && e.bulkDeleteAnnotations(m);
      return {
        canRedo: () => o.length - 1 > i,
        canUndo: () => i > -1,
        destroy: () => e.unobserve(l),
        getHistory: () => ({ changes: [...o], pointer: i }),
        on: (m, p) => n.on(m, p),
        redo: () => {
          if (o.length - 1 > i) {
            s = !0;
            const { created: m, updated: p, deleted: k } = o[i + 1];
            (u(m), f(p), g(k), n.emit("redo", o[i + 1]), (i += 1));
          }
        },
        undo: () => {
          if (i > -1) {
            s = !0;
            const { created: m, updated: p, deleted: k } = o[i];
            (a(m), d(p), h(k), n.emit("undo", o[i]), (i -= 1));
          }
        },
      };
    },
    Wi = () => {
      const e = Dt([]);
      return { subscribe: e.subscribe.bind(e), set: e.set.bind(e) };
    },
    Zi = (e, t, n, o) => {
      const { hover: i, selection: s, store: r, viewport: l } = e,
        a = new Map();
      let u = [],
        d,
        f;
      const h = (b, S) => {
          a.has(b) ? a.get(b).push(S) : a.set(b, [S]);
        },
        g = (b, S) => {
          const w = a.get(b);
          if (w) {
            const A = w.indexOf(S);
            A !== -1 && w.splice(A, 1);
          }
        },
        m = (b, S, w) => {
          a.has(b) &&
            setTimeout(() => {
              a.get(b).forEach((A) => {
                if (n) {
                  const T = Array.isArray(S)
                      ? S.map((M) => n.serialize(M))
                      : n.serialize(S),
                    C = w
                      ? w instanceof PointerEvent
                        ? w
                        : n.serialize(w)
                      : void 0;
                  A(T, C);
                } else A(S, w);
              });
            }, 1);
        },
        p = () => {
          const { selected: b } = s,
            S = (b || []).map(({ id: w }) => r.getAnnotation(w));
          (S.forEach((w) => {
            const A = u.find((T) => T.id === w.id);
            (!A || !De(A, w)) && m("updateAnnotation", w, A);
          }),
            (u = u.map((w) => S.find(({ id: T }) => T === w.id) || w)));
        };
      (s.subscribe(({ selected: b }) => {
        if (!(u.length === 0 && b.length === 0)) {
          if (u.length === 0 && b.length > 0)
            u = b.map(({ id: S }) => r.getAnnotation(S));
          else if (u.length > 0 && b.length === 0)
            (u.forEach((S) => {
              const w = r.getAnnotation(S.id);
              w && !De(w, S) && m("updateAnnotation", w, S);
            }),
              (u = []));
          else {
            const S = new Set(u.map((A) => A.id)),
              w = new Set(b.map(({ id: A }) => A));
            (u
              .filter((A) => !w.has(A.id))
              .forEach((A) => {
                const T = r.getAnnotation(A.id);
                T && !De(T, A) && m("updateAnnotation", T, A);
              }),
              (u = [
                ...u.filter((A) => w.has(A.id)),
                ...b
                  .filter(({ id: A }) => !S.has(A))
                  .map(({ id: A }) => r.getAnnotation(A)),
              ]));
          }
          m("selectionChanged", u);
        }
      }),
        i.subscribe((b) => {
          (!d && b
            ? m("mouseEnterAnnotation", r.getAnnotation(b))
            : d && !b
              ? m("mouseLeaveAnnotation", r.getAnnotation(d))
              : d &&
                b &&
                (m("mouseLeaveAnnotation", r.getAnnotation(d)),
                m("mouseEnterAnnotation", r.getAnnotation(b))),
            (d = b));
        }),
        l == null ||
          l.subscribe((b) =>
            m(
              "viewportIntersect",
              b.map((S) => r.getAnnotation(S)),
            ),
          ),
        r.observe(
          (b) => {
            o && (f && clearTimeout(f), (f = setTimeout(p, 1e3)));
</script>
</body>
</html>
`;

  // Add main image to assets
  const imageBlob = dataURLToBlob(imageDataURL);
  assetsFolder.file(imageName, imageBlob);

  // Add floorplan files to assets folder
  floorSpaces.forEach((floorSpace) => {
    floorSpace.files.forEach((file) => {
      assetsFolder.file(`${floorSpace.id}-${file.name}`, file);
    });
  });

  // Add index.html to project folder
  zip.file(`${folderName}/index.html`, content);

  // Generate the ZIP file
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
