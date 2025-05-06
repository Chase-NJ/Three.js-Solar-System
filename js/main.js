/**
 * This file contains the main scene setup and coordination logic.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import { ORB_OMEGA } from './constants.js';
import { createGrid } from './grid.js';
import { 
  createSun, 
  createEarth, 
  createEarthOrbit,
  createMoon,
  updateCelestialBodies
} from './celestialBodies.js';
import { 
  loadXWing, 
  setupXWingControls, 
  updateXWing 
} from './xwing.js';
import {
  createStarField,
  createSpaceBackground,
  updateSpaceBackground
} from './stars.js';
import { createDistantGalaxies } from './galaxies.js';

// Main scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
const clock = new THREE.Clock();

// Setup renderer
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.physicallyCorrectLights = true;

// Enable tone mapping for more realistic lighting
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.8;

document.body.appendChild(renderer.domElement);

// Set up camera and controls
camera.position.set(10, 2, 2);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);

// Add bloom post-processing
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.2,  // strength
  0.4,  // radius
  0.8   // threshold
);
composer.addPass(bloom);

// Add ambient light
const hemi = new THREE.HemisphereLight(0x8888ff, 0x000011, 1.0);
scene.add(hemi);

// Create and add the space background
const spaceBackground = createSpaceBackground();
scene.add(spaceBackground.mesh);

// Create and add distant galaxies and nebulae
createDistantGalaxies(scene);

// Create and add star field
const starField = createStarField();
scene.add(starField);

// Create and add the grid
const grid = createGrid();
scene.add(grid.mesh);

// Create and add celestial bodies
const sun = createSun();
scene.add(sun);

const earth = createEarth();
scene.add(earth);

const earthOrbit = createEarthOrbit();
scene.add(earthOrbit);

const moon = createMoon(earth);

// Organize all celestial bodies
const celestialBodies = {
  sun,
  earth,
  moon,
  earthOrbitalSpeed: ORB_OMEGA
};

// Setup X-Wing controls
setupXWingControls();

// Store for X-Wing model when loaded
let xWing;
let prevTime = 0;

// Load X-Wing model
loadXWing(scene)
  .then(model => {
    xWing = model;
  })
  .catch(error => console.error('Error loading X-Wing:', error));

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
function animate() {
  const t = clock.getElapsedTime();
  const delta = t - prevTime;
  prevTime = t;

  // Update celestial bodies
  updateCelestialBodies(celestialBodies, t, grid.material);
  
  // Update space background
  updateSpaceBackground(spaceBackground, t);
  
  // Update X-Wing position and camera
  updateXWing(xWing, camera, delta);

  // Update grid position uniform to match X-Wing position
  if (xWing && grid.material.uniforms) {
    grid.material.uniforms.playerPosition.value.copy(xWing.position);
  }
  
  // Make stars slowly rotate for a subtle effect
  starField.rotation.y = t * 0.001;
  
  // Render the scene with post-processing
  composer.render();
}

// Start animation loop
renderer.setAnimationLoop(animate);
