/**
 *  This file contains all of the logic for creating and moving the X-Wing.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ORBIT_RADIUS, MOVE_SPEED } from './constants.js';

// Control keys state object, now including q/e for yaw
export const keys = { w: false, a: false, s: false, d: false, q: false, e: false };

let heading = Math.PI;               // no initial yaw flip

// Yaw turn speed in radians per second
const TURN_SPEED = Math.PI * 0.5; // adjust as needed

// Space physics parameters
const ACCELERATION = MOVE_SPEED * 2; // Acceleration rate (units/s²)
const MAX_VELOCITY = MOVE_SPEED;     // Maximum velocity (units/s)
const DAMPENING = 0.01;              // Natural dampening factor (lower = more inertia)

// Current velocity vector
const velocity = new THREE.Vector3(0, 0, 0);

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
    if (e.code === 'KeyQ') keys.q = true;
    if (e.code === 'KeyE') keys.e = true;
  });
  
  window.addEventListener('keyup', e => {
    if (e.code === 'KeyW') keys.w = false;
    if (e.code === 'KeyA') keys.a = false;
    if (e.code === 'KeyS') keys.s = false;
    if (e.code === 'KeyD') keys.d = false;
    if (e.code === 'KeyQ') keys.q = false;
    if (e.code === 'KeyE') keys.e = false;
  });
}

/**
 * Updates the X-Wing position and orientation based on controls,
 * and moves the camera to follow behind.
 * @param {THREE.Object3D} xWing The X-Wing model
 * @param {THREE.Camera} camera The camera to move
 * @param {number} delta Time delta since last frame
 */
export function updateXWing(xWing, camera, delta) {
  if (!xWing) return;

  // Update heading based on q/e (yaw control)
  if (keys.q) heading += TURN_SPEED * delta;
  if (keys.e) heading -= TURN_SPEED * delta;

  // Get camera-relative forward and right vectors
  const camFwd = new THREE.Vector3();
  camera.getWorldDirection(camFwd);
  camFwd.y = 0;
  camFwd.normalize();

  const camRight = new THREE.Vector3();
  camRight.crossVectors(camFwd, new THREE.Vector3(0, 1, 0));
  camRight.normalize();

  // Build thrust vector from WASD
  const thrustDir = new THREE.Vector3();
  if (keys.w) thrustDir.add(camFwd);
  if (keys.s) thrustDir.sub(camFwd);
  if (keys.a) thrustDir.sub(camRight);
  if (keys.d) thrustDir.add(camRight);

  // Apply thrust and dampening
  if (thrustDir.lengthSq() > 0) {
    thrustDir.normalize();
    velocity.addScaledVector(thrustDir, ACCELERATION * delta);
    if (velocity.length() > MAX_VELOCITY) {
      velocity.normalize().multiplyScalar(MAX_VELOCITY);
    }
  } else {
    velocity.multiplyScalar(1 - DAMPENING);
  }
  
  // Move X-Wing and constrain to y=0 plane
  xWing.position.addScaledVector(velocity, delta);
  xWing.position.y = 0;
  velocity.y = 0;

  // Compute yaw quaternion based on heading
  const yawQuat = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    heading
  );

  // Determine target orientation including roll tilt
  let targetQuat;
  if (velocity.lengthSq() > 0.1) {
    const rollAngle = velocity.dot(camRight) * 0.1;
    const rollQuat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(0, 0, 1),
      rollAngle
    );
    targetQuat = yawQuat.clone().multiply(rollQuat);
  } else {
    targetQuat = yawQuat.clone();
  }

  // Smoothly interpolate to target orientation
  xWing.quaternion.slerp(targetQuat, 5 * delta);

  // Position camera behind and above relative to X-Wing orientation
  const offsetLocal = new THREE.Vector3(0, 4, -10);
  const offsetWorld = offsetLocal.applyQuaternion(xWing.quaternion);
  camera.position.copy(xWing.position).add(offsetWorld);
  camera.lookAt(xWing.position);
}
