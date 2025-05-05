/* This file contains all of the constants used throughout our Three.js scene.
 * Many of these constants are directly associated to computing shader logic,
 * movement, orbital speeds, etc. Basically, VERY IMPORTANT. */

// Physical and scene constants for the solar system

// Physics constants
export const GRAVITY = 9.8;                 // m/s^2 :)
export const SOLAR_MASS = 1000;             // This works for now
export const DIP_FALLOFF = 15.0;            // softens the "dip"
export const EARTH_MASS = SOLAR_MASS / 400; // Not to scale lol

// Grid constants
export const GRID_SIZE = 200;               // width/depth of grid mesh
export const GRID_DIVISIONS = 1600;         // subdivisions per side   

// Orbital constants
export const ORB_G = 0.2;                   // pseudo‑G for orbit speed
export const ORBIT_RADIUS = 50.0;           // distance from Sun in scene units
export const ORB_OMEGA = Math.sqrt(ORB_G * SOLAR_MASS / (ORBIT_RADIUS**3));

// Moon constants
export const MOON_SCALE = 0.273;
export const MOON_ORBIT_RADIUS = 5;

// X-Wing movement
export const MOVE_SPEED = 10;

// Visual constants
export const ORBIT_SEGMENTS = 128;          // more = smoother for orbit line
