/**
 * This file contains the logic for creating the spacetime grid visualization.
 */

import * as THREE from 'three';
import { 
  GRID_VERTEX_SHADER, 
  GRID_FRAGMENT_SHADER 
} from './shaders.js';
import { 
  GRID_SIZE, 
  GRID_DIVISIONS, 
  GRAVITY, 
  SOLAR_MASS, 
  DIP_FALLOFF, 
  EARTH_MASS 
} from './constants.js';

/**
 * Creates the grid with gravity well effect
 * @returns {Object} Object containing the grid mesh and its material
 */
export function createGrid() {
  // Create grid geometry
  const gridGeo = new THREE.PlaneGeometry(
    GRID_SIZE, GRID_SIZE,
    GRID_DIVISIONS, GRID_DIVISIONS
  );
  gridGeo.rotateX(-Math.PI/2);   // x-z plane

  // Create grid material with shaders
  const gridMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    vertexShader: GRID_VERTEX_SHADER,
    fragmentShader: GRID_FRAGMENT_SHADER
  });
  
  // Set uniforms for the grid material
  gridMat.uniforms = {
    sunPos:     { value: new THREE.Vector3(0, 0, 0) },
    mass:       { value: SOLAR_MASS },
    G:          { value: GRAVITY },
    falloff:    { value: DIP_FALLOFF },
    earthPos:   { value: new THREE.Vector3() },
    earthMass:  { value: EARTH_MASS },
    gridColor:  { value: new THREE.Color(0.8, 0.8, 0.8) },
    opacity:    { value: 0.3 },
    spacing:    { value: 2.0 },
    color: { value: new THREE.Color(0x00FF00) },
    playerPosition: { value: new THREE.Vector3(0, 0, 0) },
    maxVisibleDistance: { value: 80.0 }, // Max distance to see grid
    fadeStartDistance: { value: 30.0 }   // Distance where fade begins
  };

  // Create the grid mesh
  const gridMesh = new THREE.Mesh(gridGeo, gridMat);
  gridMesh.position.y = 0;
  
  return { mesh: gridMesh, material: gridMat };
}
