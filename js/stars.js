/**
 * This file contains the logic for creating a space-like background with stars.
 */

import * as THREE from 'three';
import { 
  STAR_FIELD_RADIUS,
  STAR_COUNT,
  STAR_SIZE_MIN,
  STAR_SIZE_MAX,
  BRIGHT_STARS_PERCENTAGE
} from './constants.js';

// Use constants or fallback to defaults
const FIELD_RADIUS = STAR_FIELD_RADIUS || 500;      // Size of the star field sphere
const BRIGHT_STARS = BRIGHT_STARS_PERCENTAGE || 0.05;     // Percentage of bright stars (0-1)

/**
 * Creates a star field with varying star sizes and colors
 * @returns {THREE.Points} The star field object
 */
export function createStarField() {
  // Create star geometry with random positions
  const starGeo = new THREE.BufferGeometry();
  const positions = [];
  const colors = [];
  const sizes = [];

  // Generate random stars in a sphere (not too close to the scene center)
  for (let i = 0; i < STAR_COUNT; i++) {
    // Create a random point on sphere using spherical coordinates
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    // Ensure stars are not too close to center (avoid cluttering main scene)
    const radius = FIELD_RADIUS * (0.4 + 0.6 * Math.random());
    
    const x = radius * Math.sin(phi) * Math.cos(theta);
    const y = radius * Math.sin(phi) * Math.sin(theta);
    const z = radius * Math.cos(phi);
    
    positions.push(x, y, z);
    
    // Randomize star colors (mostly white with some color variation)
    const isBright = Math.random() < BRIGHT_STARS;
    if (isBright) {
      // Some stars have slight color tint
      const colorOption = Math.random();
      if (colorOption < 0.3) {
        // Blueish white
        colors.push(0.8 + Math.random() * 0.2, 0.8 + Math.random() * 0.2, 1.0);
      } else if (colorOption < 0.6) {
        // Yellowish white
        colors.push(1.0, 0.9 + Math.random() * 0.1, 0.7 + Math.random() * 0.3);
      } else {
        // Reddish white
        colors.push(1.0, 0.8 + Math.random() * 0.2, 0.8 + Math.random() * 0.2);
      }
      
      // Bright stars are larger
      sizes.push(STAR_SIZE_MIN + Math.random() * (STAR_SIZE_MAX - STAR_SIZE_MIN));
    } else {
      // Regular white/gray stars
      const brightness = 0.6 + Math.random() * 0.4;
      colors.push(brightness, brightness, brightness);
      
      // Regular stars have varying but smaller sizes
      sizes.push(STAR_SIZE_MIN + Math.random() * 0.3);
    }
  }

  // Create the geometry and set attributes
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  starGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  starGeo.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

  // Create star material with custom shaders for better-looking stars
  const starMaterial = new THREE.PointsMaterial({
    size: 1,
    vertexColors: true,
    transparent: true,
    map: createStarTexture(),
    alphaTest: 0.1,
    // Using small points for stars looks better for deep space feel
    sizeAttenuation: true,
  });

  // Create the star field points
  const starField = new THREE.Points(starGeo, starMaterial);
  
  return starField;
}

/**
 * Creates a texture for individual stars
 * @returns {THREE.Texture} The star texture
 */
function createStarTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, 0,
    canvas.width / 2, canvas.height / 2, canvas.width / 2
  );
  
  // Bright center fading out to transparent edges
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.1, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(0.25, 'rgba(255, 255, 255, 0.3)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates a dark space background with subtle nebulae
 * @returns {THREE.Mesh} The space background mesh
 */
export function createSpaceBackground() {
  // Create a very large sphere that surrounds the entire scene
  const skyGeo = new THREE.SphereGeometry(FIELD_RADIUS - 1, 32, 32);
  // Inside faces for the background
  skyGeo.scale(-1, 1, 1);
  
  // Create a custom shader material for the space background
  const spaceMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vPosition;
      
      void main() {
        vUv = uv;
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float time;
      varying vec2 vUv;
      varying vec3 vPosition;
      
      // Simplex noise function
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
      
      float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        
        // First corner
        vec3 i = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        
        // Other corners
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        
        // Permutations
        i = mod289(i);
        vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
                + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                + i.x + vec4(0.0, i1.x, i2.x, 1.0));
                
        // Gradients
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        
        vec4 x = x_ * ns.x + ns.yyyy;
        vec4 y = y_ * ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        
        vec4 s0 = floor(b0) * 2.0 + 1.0;
        vec4 s1 = floor(b1) * 2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        
        vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
        
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        
        // Normalise gradients
        vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;
        
        // Mix final noise value
        vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
      }
      
      void main() {
        // Base deep space color (very dark blue)
        vec3 baseColor = vec3(0.01, 0.01, 0.03);
        
        // Calculate position on the sphere for noise sampling
        vec3 samplePos = normalize(vPosition) * 2.0;
        
        // Sample noise at different scales
        float noise1 = snoise(samplePos * 1.0) * 0.5 + 0.5;
        float noise2 = snoise(samplePos * 3.0 + vec3(time * 0.01)) * 0.5 + 0.5;
        
        // Combine noise for nebula effect
        float nebula = noise1 * noise2;
        nebula = pow(nebula, 3.0); // Make the nebulae more subtle
        
        // Create subtle color variation for nebulae
        vec3 nebulaColor1 = vec3(0.2, 0.0, 0.3); // Purple
        vec3 nebulaColor2 = vec3(0.0, 0.1, 0.2); // Dark blue
        
        // Mix nebula colors with base color based on position
        float colorMix = snoise(samplePos * 0.5) * 0.5 + 0.5;
        vec3 finalNebulaColor = mix(nebulaColor1, nebulaColor2, colorMix);
        
        // Apply subtle nebula color to base
        vec3 finalColor = baseColor + finalNebulaColor * nebula * 0.1;
        
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
    side: THREE.BackSide, // Render on inside of sphere
    depthWrite: false
  });
  
  const skyDome = new THREE.Mesh(skyGeo, spaceMaterial);
  
  return { mesh: skyDome, material: spaceMaterial };
}

/**
 * Updates space background effects based on elapsed time
 * @param {Object} background The space background object
 * @param {number} time Current time
 */
export function updateSpaceBackground(background, time) {
  if (background && background.material && background.material.uniforms) {
    background.material.uniforms.time.value = time;
  }
}
