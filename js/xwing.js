/**
 *  This file contains all of the logic for creating and moving the X-Wing.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ORBIT_RADIUS, MOVE_SPEED } from './constants.js';

// Control keys state object
export const keys = { w: false, a: false, s: false, d: false };

// Fixed quaternion for X-Wing orientation
const fixedQuat = new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(0, 1, 0),
  Math.PI
);

/**
 * Loads the X-Wing model
 * @param {THREE.Scene} scene The scene to add the X-Wing to
 * @returns {Promise<THREE.Object3D>} Promise that resolves to the X-Wing object
 */
export function loadXWing(scene) {
  return new Promise((resolve, reject) => {
    const gltfLoader = new GLTFLoader();
    gltfLoader.load(
      'x-wing/scene.gltf',
      gltf => {
        const xWing = gltf.scene;
        xWing.scale.set(0.5, 0.5, 0.5);
        xWing.position.set(0, 0, ORBIT_RADIUS);
    
        // Lock its nose straight
        xWing.quaternion.copy(fixedQuat);
    
        scene.add(xWing);
        resolve(xWing);
      },
      undefined,
      err => reject(err)
    );
  });
}

/**
 * Set up keyboard event listeners for X-Wing controls
 */
export function setupXWingControls() {
  window.addEventListener('keydown', e => {
    if (e.code === 'KeyW') keys.w = true;
    if (e.code === 'KeyA') keys.a = true;
    if (e.code === 'KeyS') keys.s = true;
    if (e.code === 'KeyD') keys.d = true;
  });
  
  window.addEventListener('keyup', e => {
    if (e.code === 'KeyW') keys.w = false;
    if (e.code === 'KeyA') keys.a = false;
    if (e.code === 'KeyS') keys.s = false;
    if (e.code === 'KeyD') keys.d = false;
  });
}

/**
 * Updates the X-Wing position based on controls and follows with camera
 * @param {THREE.Object3D} xWing The X-Wing model
 * @param {THREE.Camera} camera The camera to move
 * @param {number} delta Time delta since last frame
 */
export function updateXWing(xWing, camera, delta) {
  if (!xWing) return;
  
  const camFwd = new THREE.Vector3();
  camera.getWorldDirection(camFwd);
  camFwd.y = 0;
  camFwd.normalize();

  const camRight = new THREE.Vector3();
  camRight.crossVectors(camFwd, new THREE.Vector3(0, 1, 0));  // right‐hand rule
  camRight.normalize();

  // Build our move vector from WASD (camera‐relative)
  const moveDir = new THREE.Vector3();
  if (keys.w) moveDir.add(camFwd);
  if (keys.s) moveDir.sub(camFwd);
  if (keys.a) moveDir.sub(camRight);
  if (keys.d) moveDir.add(camRight);

  if (moveDir.lengthSq() > 0) {
    moveDir.normalize();
    // slide the X-Wing
    xWing.position.addScaledVector(moveDir, MOVE_SPEED * delta);
    // clamp to y=0 plane
    xWing.position.y = 0;
  }

  // Re-lock orientation every frame
  xWing.quaternion.copy(fixedQuat);

  // Camera follows behind at a fixed offset relative to world axes
  const offset = new THREE.Vector3(0, 4, 10);
  camera.position.copy(xWing.position).add(offset);
  camera.lookAt(xWing.position);
}
