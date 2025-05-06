/* This file contains all of the logic associated with creating, positioning,
 * and animating the celestial bodies in our solar system scene. */

import * as THREE from 'three';
import { 
  SUN_VERTEX_SHADER, 
  SUN_FRAGMENT_SHADER 
} from './shaders.js';
import { 
  SOLAR_MASS, 
  EARTH_MASS, 
  ORBIT_RADIUS, 
  MOON_SCALE, 
  MOON_ORBIT_RADIUS,
  ORB_G,
  ORBIT_SEGMENTS
} from './constants.js';

/**
 * Creates the Sun mesh with custom shader material
 * @returns {THREE.Mesh} The Sun mesh
 */
export function createSun() {
  const sunMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time:  { value: 0.0 },
      scale: { value: 2.0 },   // controls granule size
      speed: { value: 0.5 }    // animation speed
    },
    vertexShader: SUN_VERTEX_SHADER,
    fragmentShader: SUN_FRAGMENT_SHADER
  });
  
  const sunGeometry = new THREE.SphereGeometry(32, 128, 128);
  const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
  sunMesh.position.set(0, 0, 0);
  
  // The Sun should emit light
  const sunLight = new THREE.PointLight(0xffffff, 100000, 0, 2);
  sunMesh.add(sunLight);
  sunLight.position.set(0, 0, 0);
  
  return sunMesh;
}

/**
 * Creates the Earth mesh with textures
 * @returns {THREE.Mesh} The Earth mesh
 */
export function createEarth() {
  const earthGeo = new THREE.SphereGeometry(4.0, 128, 128);
  const texLoader = new THREE.TextureLoader();
  const colorMap = texLoader.load('earth-day.jpg');
  const topoMap = texLoader.load('earth-topography.jpg');
  const maxAniso = 16;

  // Improve sampling on glancing angles
  colorMap.anisotropy = maxAniso;
  topoMap.anisotropy = maxAniso;

  const earthMat = new THREE.MeshPhongMaterial({
    map: colorMap,
    bumpMap: topoMap,
    bumpScale: 0.05,           // how "bumpy" the topography looks
    emissive: 0x002244,
    emissiveIntensity: 0.2,
  });
  
  return new THREE.Mesh(earthGeo, earthMat);
}

/**
 * Creates the Earth's orbit visualization
 * @returns {THREE.LineLoop} The orbit line
 */
export function createEarthOrbit() {
  // build an array of points around a circle
  const orbitPts = [];
  for(let i = 0; i <= ORBIT_SEGMENTS; i++){
    const θ = (i / ORBIT_SEGMENTS) * Math.PI * 2;
    orbitPts.push(
      new THREE.Vector3(
        Math.cos(θ) * ORBIT_RADIUS,
        0,       // same height as Sun (and grid)
        Math.sin(θ) * ORBIT_RADIUS
      )
    );
  }
  
  const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts);
  const orbitMat = new THREE.LineBasicMaterial({
    color: 0xcccccc,
    transparent: true,
    opacity: 0.6,
    linewidth: 1            // note: may be ignored on some platforms
  });
  
  return new THREE.LineLoop(orbitGeo, orbitMat);
}

/**
 * Creates the Moon mesh and pivots it around Earth
 * @param {THREE.Mesh} earthMesh The Earth mesh to attach to
 * @returns {Object} The Moon object with mesh and pivot
 */
export function createMoon(earthMesh) {
  const texLoader = new THREE.TextureLoader();
  const moonColor = texLoader.load('moon-map.jpg');
  const moonTopo = texLoader.load('moon-topography.jpg');

  // Improve texture sampling
  const maxAniso = 16; // Use a reasonable default
  
  moonColor.anisotropy = maxAniso;
  moonTopo.anisotropy = maxAniso;

  // sphere segments can stay modest since it's small on screen
  const moonGeo = new THREE.SphereGeometry(4.0 * MOON_SCALE, 128, 128);

  const moonMat = new THREE.MeshLambertMaterial({
    map: moonColor,
    bumpMap: moonTopo,
    bumpScale: 0.02,             // tweak until craters look right
  });

  // assemble
  const moonMesh = new THREE.Mesh(moonGeo, moonMat);

  // pivot point at Earth's center
  const moonPivot = new THREE.Object3D();
  earthMesh.add(moonPivot);

  // place Moon on the +X axis of that pivot
  moonMesh.position.set(MOON_ORBIT_RADIUS, 1, 0);
  moonPivot.add(moonMesh);
  
  // Calculate moon orbital speed
  const MOON_OMEGA = Math.sqrt(ORB_G * EARTH_MASS / (MOON_ORBIT_RADIUS**3));
  
  return { 
    mesh: moonMesh, 
    pivot: moonPivot,
    omega: MOON_OMEGA 
  };
}

/**
 * Updates the celestial bodies based on elapsed time
 * @param {Object} bodies Object containing all celestial bodies
 * @param {number} time Current time
 * @param {THREE.ShaderMaterial} gridMaterial Grid material for updating uniforms
 */
export function updateCelestialBodies(bodies, time, gridMaterial) {
  // Sun animation update
  bodies.sun.material.uniforms.time.value = time;
  
  // Moon orbit update
  bodies.moon.pivot.rotation.y = bodies.moon.omega * time;

  // Tidally-locked rotation so the same face always points to Earth
  bodies.moon.mesh.rotation.y = bodies.moon.omega * time;

  // Earth orbital position (circular)
  const ang = bodies.earthOrbitalSpeed * time;
  const ex = ORBIT_RADIUS * Math.cos(ang);
  const ez = ORBIT_RADIUS * Math.sin(ang);
  const ey = bodies.sun.position.y;

  // Update Earth position & grid dip
  bodies.earth.position.set(ex, ey, ez);
  if (gridMaterial && gridMaterial.uniforms) {
    gridMaterial.uniforms.earthPos.value.copy(bodies.earth.position);
  }

  // Rotate Earth on its axis
  bodies.earth.rotation.y = time * 0.1;
}
