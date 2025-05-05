/* This file contains all of the GLSL shaders used for objects materials.
 * much of this code has been dragged from some corner of the internet or
 * another. */

// Spacetime "grid"
export const GRID_VERTEX_SHADER = `
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
`;

export const GRID_FRAGMENT_SHADER = `
    uniform vec3 gridColor;
    uniform float opacity, spacing;
    uniform vec3 playerPosition;
    uniform float maxVisibleDistance;
    uniform float fadeStartDistance;
    varying vec3 vWorldPos;

    // draw anti-aliased grid lines with distance-based fading
    void main(){
      // Calculate distance from player to current grid point
      float distToPlayer = length(vWorldPos - playerPosition);
      
      // Calculate fade factor based on distance
      float fadeFactor = 1.0 - smoothstep(fadeStartDistance, maxVisibleDistance, distToPlayer);
      
      // uv in grid units
      vec2 uv = vWorldPos.xz / spacing;

      // grid pattern: distance to nearest line
      vec2 g = abs(fract(uv) - 0.5);

      // approximate screen-space derivative for AA
      vec2 fw = fwidth(uv);

      // line mask: thin where g < fw
      vec2 line = smoothstep(vec2(0.0), fw, g);

      // combine X and Z lines
      float mask = 1.0 - min(line.x, line.y);

      // Apply both the grid mask and the distance fade
      float finalOpacity = mask * opacity * fadeFactor;
      
      // final color + alpha
      gl_FragColor = vec4(gridColor, finalOpacity);
    }
`;

// The Sun (this one's actually kinda cool)
export const SUN_VERTEX_SHADER = `
    varying vec3 vNormal;
    void main(){
      vNormal = normalMatrix * normal;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
`;

export const SUN_FRAGMENT_SHADER = `
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
`;
