/**
 * This file contains the logic for creating distant galaxies and nebulae.
 */

import * as THREE from 'three';
import { STAR_FIELD_RADIUS } from './constants.js';

// Nebula configuration
const NEBULA_COUNT = 5;
const GALAXY_COUNT = 3;

/**
 * Creates distant galaxies and nebulae for the background
 * @param {THREE.Scene} scene The scene to add galaxies to
 */
export function createDistantGalaxies(scene) {
  createNebulae(scene);
  createGalaxies(scene);
}

/**
 * Creates colorful nebulae clouds in the background
 * @param {THREE.Scene} scene The scene to add nebulae to
 */
function createNebulae(scene) {
  const radius = STAR_FIELD_RADIUS * 0.8; // Slightly inside the star field
  
  for (let i = 0; i < NEBULA_COUNT; i++) {
    // Random position on sphere
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    
    // Create nebula geometry (flat disc facing camera)
    const size = 40 + Math.random() * 80;
    const nebulaGeo = new THREE.PlaneGeometry(size, size);
    
    // Select color for this nebula (subtle pastel colors)
    const colors = [
      new THREE.Color(0.4, 0.2, 0.6), // Purple
      new THREE.Color(0.2, 0.4, 0.6), // Blue
      new THREE.Color(0.6, 0.3, 0.2), // Orange
      new THREE.Color(0.2, 0.6, 0.4), // Teal
      new THREE.Color(0.5, 0.3, 0.5)  // Pink
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    // Create nebula material with fading edges
    const nebulaMat = new THREE.MeshBasicMaterial({
      map: createNebulaTexture(color),
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    
    const nebula = new THREE.Mesh(nebulaGeo, nebulaMat);
    
    // Position and orient nebula to always face center
    nebula.position.set(x, y, z);
    nebula.lookAt(0, 0, 0);
    
    // Add rotation for variety
    nebula.rotation.z = Math.random() * Math.PI * 2;
    
    scene.add(nebula);
  }
}

/**
 * Creates a texture for nebula with fading edges
 * @param {THREE.Color} color Base color for the nebula
 * @returns {THREE.Texture} The nebula texture
 */
function createNebulaTexture(color) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  
  const ctx = canvas.getContext('2d');
  
  // Create circular gradient
  const gradient = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, 0,
    canvas.width / 2, canvas.height / 2, canvas.width / 2
  );
  
  // Color at center (more opaque)
  gradient.addColorStop(0, `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, 0.5)`);
  // Color at edges (transparent)
  gradient.addColorStop(1, `rgba(${color.r * 255}, ${color.g * 255}, ${color.b * 255}, 0)`);
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add some noise for texture
  addNoiseToCanvas(ctx, canvas.width, canvas.height, 0.2);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates distant spiral galaxies
 * @param {THREE.Scene} scene The scene to add galaxies to
 */
function createGalaxies(scene) {
  const radius = STAR_FIELD_RADIUS * 0.9; // Further out than nebulae
  
  for (let i = 0; i < GALAXY_COUNT; i++) {
    // Random position on sphere
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    
    // Create galaxy geometry (flat disc)
    const size = 80 + Math.random() * 120;
    const galaxyGeo = new THREE.PlaneGeometry(size, size);
    
    // Create galaxy texture and material
    const galaxyMat = new THREE.MeshBasicMaterial({
      map: createGalaxyTexture(),
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    
    const galaxy = new THREE.Mesh(galaxyGeo, galaxyMat);
    
    // Position and orient galaxy to face center (more or less)
    galaxy.position.set(x, y, z);
    galaxy.lookAt(0, 0, 0);
    
    // Tilt galaxy slightly for realism
    galaxy.rotation.z = Math.random() * Math.PI;
    galaxy.rotation.x += (Math.random() - 0.5) * 0.5;
    galaxy.rotation.y += (Math.random() - 0.5) * 0.5;
    
    scene.add(galaxy);
  }
}

/**
 * Creates a texture for spiral galaxy
 * @returns {THREE.Texture} The galaxy texture
 */
function createGalaxyTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  
  const ctx = canvas.getContext('2d');
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  
  // Clear canvas
  ctx.fillStyle = 'rgba(0, 0, 0, 0)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw galaxy core
  const coreGradient = ctx.createRadialGradient(
    centerX, centerY, 0,
    centerX, centerY, 50
  );
  
  coreGradient.addColorStop(0, 'rgba(255, 255, 200, 0.8)');
  coreGradient.addColorStop(1, 'rgba(255, 255, 200, 0)');
  
  ctx.fillStyle = coreGradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 50, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw spiral arms
  const armCount = 2 + Math.floor(Math.random() * 2); // 2-3 arms
  const armSwirlFactor = 0.2 + Math.random() * 0.3; // Controls how tightly wound the arms are
  const armWidth = 0.15 + Math.random() * 0.1; // Width of the arms as a fraction of radius
  const maxRadius = canvas.width / 2 - 10; // Maximum radius of the spiral arms
  
  // Choose galaxy color theme
  const themes = [
    { primary: [255, 240, 220], secondary: [255, 200, 150] }, // Yellowish
    { primary: [220, 230, 255], secondary: [180, 190, 255] }, // Blueish
    { primary: [255, 230, 230], secondary: [255, 180, 180] }  // Reddish
  ];
  const theme = themes[Math.floor(Math.random() * themes.length)];
  
  // Draw each spiral arm
  for (let arm = 0; arm < armCount; arm++) {
    const armAngleOffset = (arm * 2 * Math.PI) / armCount;
    
    // Draw star particles along the spiral
    for (let i = 0; i < 2000; i++) {
      // Random distance from center (more particles toward the outside)
      const distance = Math.pow(Math.random(), 0.5) * maxRadius;
      if (distance < 30) continue; // Skip core region
      
      // Calculate angle based on spiral equation: θ = α * ln(r)
      const angle = armAngleOffset + armSwirlFactor * Math.log(distance);
      
      // Add random deviation from perfect spiral
      const deviation = (Math.random() - 0.5) * armWidth * distance;
      const armAngle = angle + deviation / distance;
      
      // Calculate position
      const x = centerX + distance * Math.cos(armAngle);
      const y = centerY + distance * Math.sin(armAngle);
      
      // Skip if outside canvas
      if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue;
      
      // Determine brightness and size of this star
      const brightness = 0.7 + 0.3 * Math.random();
      const size = Math.random() < 0.05 ? 2 : 1; // Some stars are bigger
      
      // Choose color - mix primary/secondary based on position in arm
      const useSecondary = Math.random() < 0.4; // 40% chance of secondary color
      const color = useSecondary ? theme.secondary : theme.primary;
      
      // Draw the star
      ctx.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${brightness})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // Add dust lanes (darker areas within the arms)
  for (let arm = 0; arm < armCount; arm++) {
    const armAngleOffset = (arm * 2 * Math.PI) / armCount + 0.2; // Offset from bright area
    
    for (let i = 0; i < 300; i++) {
      const distance = 50 + Math.pow(Math.random(), 0.6) * (maxRadius - 50);
      const angle = armAngleOffset + armSwirlFactor * Math.log(distance);
      
      // Tighter concentration for dust lanes
      const deviation = (Math.random() - 0.5) * armWidth * distance * 0.5;
      const armAngle = angle + deviation / distance;
      
      const x = centerX + distance * Math.cos(armAngle);
      const y = centerY + distance * Math.sin(armAngle);
      
      if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue;
      
      // Dust is dark and semi-transparent
      ctx.fillStyle = 'rgba(10, 10, 10, 0.3)';
      ctx.beginPath();
      ctx.arc(x, y, 1 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // Apply a subtle glow effect around the galaxy
  const glowGradient = ctx.createRadialGradient(
    centerX, centerY, maxRadius * 0.7,
    centerX, centerY, maxRadius
  );
  
  const glowColor = theme.primary;
  glowGradient.addColorStop(0, `rgba(${glowColor[0]}, ${glowColor[1]}, ${glowColor[2]}, 0)`);
  glowGradient.addColorStop(1, `rgba(${glowColor[0]}, ${glowColor[1]}, ${glowColor[2]}, 0.1)`);
  
  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
  ctx.fill();
  
  // Create texture from canvas
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Adds noise to a canvas context for more realistic textures
 * @param {CanvasRenderingContext2D} ctx Canvas context to add noise to
 * @param {number} width Canvas width
 * @param {number} height Canvas height
 * @param {number} intensity Noise intensity (0-1)
 */
function addNoiseToCanvas(ctx, width, height, intensity) {
  // Get the current image data
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  // Add noise to each pixel
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 0) { // Only add noise to non-transparent pixels
      // Generate noise value (-intensity to +intensity)
      const noise = (Math.random() * 2 - 1) * intensity * 255;
      
      // Apply noise to RGB channels
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
  }
  
  // Put the modified image data back
  ctx.putImageData(imageData, 0, 0);
}