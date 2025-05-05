import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';    // This lets us load in 3D models :)
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer }      from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass }          from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass }     from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// Renderer, camera, scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
const renderer = new THREE.WebGLRenderer({ antialias: true });

const clock = new THREE.Clock();

const keys = { w:false, a:false, s:false, d:false };
let xWing, prevTime = 0;
const moveSpeed = 10;
const fixedQuat = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(0, 1, 0),
    Math.PI
  );

// key listeners (also top-level)
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

// Add the scene to our html document and set size
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.physicallyCorrectLights = true;
document.body.appendChild( renderer.domElement );
camera.position.set( 10, 2, 2 );
const controls = new OrbitControls( camera, renderer.domElement );
controls.target.set(0, 0, 0);

// Add some bloom to make our star LOOK bright :)
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.2,  // strength
  0.4,  // radius
  0.8   // threshold
);
composer.addPass(bloom);

// We're gonna be needing a lot of constants...
const GRAVITY           = 9.8;              // m/s^2 :)
const GRID_SIZE         = 200;              // width/depth of grid mesh
const GRID_DIVISIONS    = 1600;             // subdivisions per side   
const SOLAR_MASS        = 1000;             // This works for now
const DIP_FALLOFF       = 15.0;             // softens the "dip"
const EARTH_MASS        = SOLAR_MASS / 400; // Not to scale lol

// — orbital radius & angular speed (Kepler’s 3rd law for circular orbit) —
// ω = √(G_orbit * M_sun / r^3)
const ORB_G          = 0.2;     // pseudo‑G for orbit speed
const ORBIT_RADIUS   = 50.0;    // distance from Sun in scene units
const ORB_OMEGA      = Math.sqrt(ORB_G * SOLAR_MASS / (ORBIT_RADIUS**3));

// Making the grid like I'm Sam Flynn
const gridGeo = new THREE.PlaneGeometry(
  GRID_SIZE, GRID_SIZE,
  GRID_DIVISIONS, GRID_DIVISIONS
);
gridGeo.rotateX(-Math.PI/2);   // x-z plane

// Shader to draw the gridlines based on mass of objects in our scene
const gridMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite:  false,
  vertexShader: `
    uniform vec3 sunPos, earthPos;
    uniform float mass, earthMass, G, falloff;
    varying vec3 vWorldPos;

    void main(){
        vec4 wp = modelMatrix * vec4(position,1.0);

        // horizontal distances
        float dSun   = length(wp.xz - sunPos.xz) + 0.0001;
        float dEarth = length(wp.xz - earthPos.xz) + 0.0001;

        // inverse‑square dips
        float dipSun   = G * mass      / (dSun*dSun   + falloff);
        float dipEarth = G * earthMass / (dEarth*dEarth + falloff);

        // total dip
        wp.y -= (dipSun + dipEarth);

        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragmentShader: `
    uniform vec3 gridColor;
    uniform float opacity, spacing;
    varying vec3 vWorldPos;

    // draw anti‑aliased grid lines
    void main(){
      // uv in grid units
      vec2 uv = vWorldPos.xz / spacing;

      // grid pattern: distance to nearest line
      vec2 g = abs(fract(uv) - 0.5);

      // approximate screen‑space derivative for AA
      vec2 fw = fwidth(uv);

      // line mask: thin where g < fw
      vec2 line = smoothstep(vec2(0.0), fw, g);

      // combine X and Z lines
      float mask = 1.0 - min(line.x, line.y);

      // final color + alpha
      gl_FragColor = vec4(gridColor, mask * opacity);
    }
  `
});
gridMat.uniforms = {
    sunPos:     { value: new THREE.Vector3(0, 0, 0) },
    mass:       { value: SOLAR_MASS },
    G:          { value: GRAVITY },
    falloff:    { value: DIP_FALLOFF },
    earthPos:   { value: new THREE.Vector3() },
    earthMass:  { value: EARTH_MASS },
    gridColor:  { value: new THREE.Color(0.8,0.8,0.8) },
    opacity:    { value: 0.3 },
    spacing:    { value: 2.0 },
  };

// Create mesh and add to scene
const gridMesh = new THREE.Mesh(gridGeo, gridMat);
gridMesh.position.y = 0;
scene.add(gridMesh);

// 3D noise for our Sun's surface texture
const sunMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time:  { value: 0.0 },
      scale: { value: 2.0 },   // controls granule size
      speed: { value: 0.5 }    // animation speed
    },
    vertexShader: `
      varying vec3 vNormal;
      void main(){
        vNormal = normalMatrix * normal;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
      }
    `,
    fragmentShader: `
      uniform float time, scale, speed;
      varying vec3 vNormal;
  
      // ---- begin Ashima 3D simplex noise funcs (snoise) ----
      vec3 _mod289(vec3 x){ return x - floor(x*(1.0/289.0))*289.0; }
      vec4 _mod289(vec4 x){ return x - floor(x*(1.0/289.0))*289.0; }
      vec4 _permute(vec4 x){ return _mod289(((x*34.0)+1.0)*x); }
      vec4 _taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
  
      float snoise(vec3 v){
        const vec2  C = vec2(1.0/6.0, 1.0/3.0);
        const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
  
        // First corner
        vec3 i = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
  
        // Other corners
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min( g.xyz, l.zxy );
        vec3 i2 = max( g.xyz, l.zxy );
  
        //  x0 = x0 - 0.0 + 0.0 * C.xxx
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
        vec3 x3 = x0 - D.yyy;      // -1.0 + 3.0*C.x = -0.5
  
        // Permutations
        i = _mod289(i);
        vec4 p = _permute(_permute(_permute(
                 i.z + vec4(0.0, i1.z, i2.z, 1.0))
               + i.y + vec4(0.0, i1.y, i2.y, 1.0))
               + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  
        // Gradients: 7x7 points over a square, mapped onto an octahedron.
        float n_ = 0.142857142857; // 1.0/7.0
        vec3  ns = n_ * D.wyz - D.xzx;
  
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  // mod(p,7*7)
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
  
        vec4 x = x_ * ns.x + ns.yyyy;
        vec4 y = y_ * ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
  
        vec4 b0 = vec4( x.xy, y.xy );
        vec4 b1 = vec4( x.zw, y.zw );
  
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
  
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
  
        // Normalise gradients
        vec4 norm = _taylorInvSqrt(vec4(
          dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)
        ));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  
        // Mix final noise value
        vec4 m = max(0.6 - vec4(
          dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)
        ), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(
          dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)
        ));
      }
      // ---- end snoise ----
  
      void main(){
        // sample 3D noise on the sphere surface
        vec3 pos = normalize(vNormal) * scale + vec3(time*speed);
        float n = snoise(pos) * 0.5 + 0.5;   // remap to [0,1]
  
        // color gradient
        vec3 base = mix(vec3(0.8,0.2,0.0), vec3(1.0,0.9,0.6), n);
  
        // ambient + dynamic glow
        float ambient = 1.0;
        float glow    = smoothstep(0.3,1.0,n)*1.5;
        float b       = ambient + glow;
  
        gl_FragColor = vec4(base * b, 1.0);
      }
    `
});
  
  
// Create the Sun!
const sunGeometry = new THREE.SphereGeometry(8, 128, 128);
const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
sunMesh.position.set(0, 0, 0);
scene.add(sunMesh);

// The Sun should emit light
const sunLight = new THREE.PointLight(0xffffff, 1000, 0, 2);
sunMesh.add(sunLight);
sunLight.position.set(0, 0, 0);
const hemi = new THREE.HemisphereLight(0x8888ff, 0x000011, 0.05);
scene.add(hemi);

// Earth
const earthGeo  = new THREE.SphereGeometry(1.0, 128, 128);
const texLoader   = new THREE.TextureLoader();
const colorMap    = texLoader.load('earth-day.jpg');            // your earth map
const topoMap     = texLoader.load('earth-topography.jpg');     // your heightmap

// Optional: improve sampling on glancing angles
colorMap.anisotropy = renderer.capabilities.getMaxAnisotropy();
topoMap.anisotropy  = renderer.capabilities.getMaxAnisotropy();

// Make the earth using the texture maps from NASA
const earthMat = new THREE.MeshPhongMaterial({
  map:          colorMap,
  bumpMap:      topoMap,
  bumpScale:    0.05,           // how “bumpy” the topography looks
  emissive:     0x002244,
  emissiveIntensity: 0.2,
});
const earthMesh = new THREE.Mesh(earthGeo, earthMat);
scene.add(earthMesh);

// Create the Earth's orbit
const orbitSegments = 128;          // more = smoother

// build an array of points around a circle
const orbitPts = [];
for(let i = 0; i <= orbitSegments; i++){
  const θ = (i / orbitSegments) * Math.PI * 2;
  orbitPts.push(
    new THREE.Vector3(
      Math.cos(θ) * ORBIT_RADIUS,
      sunMesh.position.y,       // same height as Sun (and grid)
      Math.sin(θ) * ORBIT_RADIUS
    )
  );
}
const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts);
const orbitMat = new THREE.LineBasicMaterial({
    color:       0xcccccc,
    transparent: true,
    opacity:     0.6,
    linewidth:   1            // note: may be ignored on some platforms
});
const orbitLine = new THREE.LineLoop(orbitGeo, orbitMat);
scene.add(orbitLine);

// The Moon
const moonColor  = texLoader.load('moon-map.jpg');
const moonTopo   = texLoader.load('moon-topography.jpg');  // grayscale bump map

const maxAniso = renderer.capabilities.getMaxAnisotropy();
moonColor.anisotropy = maxAniso;
moonTopo.anisotropy  = maxAniso;

const MOON_SCALE = 0.273;

// sphere segments can stay modest since it’s small on screen
const moonGeo = new THREE.SphereGeometry(1 * MOON_SCALE, 128, 128);

const moonMat = new THREE.MeshLambertMaterial({
  map:       moonColor,
  bumpMap:   moonTopo,
  bumpScale: 0.02,             // tweak until craters look right
});

// assemble
const moonMesh = new THREE.Mesh(moonGeo, moonMat);
const MOON_ORBIT_RADIUS = 5; 

// pivot point at Earth’s center
const moonPivot = new THREE.Object3D();
earthMesh.add(moonPivot);

// place Moon on the +X axis of that pivot
moonMesh.position.set(MOON_ORBIT_RADIUS, 0, 0);
moonPivot.add(moonMesh);
const MOON_OMEGA = Math.sqrt( ORB_G * EARTH_MASS / (MOON_ORBIT_RADIUS**3) );

// X-Wing Avatar!
// ─── 1) X-Wing loader & state ─────────────────────────────────────────────────
const gltfLoader = new GLTFLoader();
gltfLoader.load(
    'x-wing/scene.gltf',
    gltf => {
      xWing = gltf.scene;
      xWing.scale.set(0.5,0.5,0.5);
      xWing.position.set(0,0, ORBIT_RADIUS);
  
      // Now that xWing exists, lock its nose straight
      xWing.quaternion.copy(fixedQuat);
  
      scene.add(xWing);
    },
    undefined,
    err => console.error(err)
  );

// animate
function animate() {
    const t = clock.getElapsedTime();
    const delta = t - prevTime;
    prevTime = t;

    // spin the pivot to orbit the Moon
    moonPivot.rotation.y = MOON_OMEGA * t;

    // optional: tidally-locked rotation so the same face always points to Earth
    moonMesh.rotation.y  = MOON_OMEGA * t;
  
    // — 4.1 Earth orbital position (circular) —
    const ang = ORB_OMEGA * t;
    const ex  = ORBIT_RADIUS * Math.cos(ang);
    const ez  = ORBIT_RADIUS * Math.sin(ang);
    const ey  = sunMesh.position.y;
  
    // — 4.3 assign Earth position & update uniforms for grid dip —
    earthMesh.position.set(ex, ey, ez);
    gridMat.uniforms.earthPos.value.copy(earthMesh.position);
  
    // — 4.4 rotate Earth on its axis if you like —
    earthMesh.rotation.y = t * 0.5;
  
    // — 4.5 update Sun time & render —
    sunMaterial.uniforms.time.value    = t;

    // — X-Wing movement & camera follow —
    if (xWing) {
        const camFwd = new THREE.Vector3();
        camera.getWorldDirection(camFwd);
        camFwd.y = 0;
        camFwd.normalize();

        const camRight = new THREE.Vector3();
        camRight.crossVectors(camFwd, new THREE.Vector3(0,1,0));  // right‐hand rule
        camRight.normalize();

        // — build our move vector from WASD (camera‐relative) —
        const moveDir = new THREE.Vector3();
        if (keys.w) moveDir.add(camFwd);
        if (keys.s) moveDir.sub(camFwd);
        if (keys.a) moveDir.sub(camRight);
        if (keys.d) moveDir.add(camRight);

        if (moveDir.lengthSq() > 0) {
        moveDir.normalize();
        // slide the X-Wing
        xWing.position.addScaledVector(moveDir, moveSpeed * delta);
        // clamp to y=0 plane
        xWing.position.y = 0;
        }

        // — re-lock your orientation every frame —
        xWing.quaternion.copy(fixedQuat);

        // — camera follows behind at a fixed offset relative to world axes —
        const offset = new THREE.Vector3(0, 4, 10);
        camera.position.copy(xWing.position).add(offset);
        camera.lookAt(xWing.position);
    }
    composer.render();
  }
renderer.setAnimationLoop(animate);
