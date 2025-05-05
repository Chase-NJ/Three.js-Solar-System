/* This file contains all of the constants used throughout our Three.js scene.
 * Many of these constants are directly associated to computing shader logic,
 * movement, orbital speeds, etc. Basically, VERY IMPORTANT. */

// Physical and scene constants for the solar system

// Physics constants
export const GRAVITY = 9.8;                 // m/s^2 :)
export const SOLAR_MASS = 10000;             // This works for now
export const DIP_FALLOFF = 20.0;            // softens the "dip"
export const EARTH_MASS = SOLAR_MASS / 4000; // Not to scale lol

// Grid constants
export const GRID_SIZE = 1000;               // width/depth of grid mesh
export const GRID_DIVISIONS = 1600;         // subdivisions per side   

// Orbital constants
export const ORB_G = 0.2;                   // pseudo‑G for orbit speed
export const ORBIT_RADIUS = 100.0;           // distance from Sun in scene units
export const ORB_OMEGA = Math.sqrt(ORB_G * SOLAR_MASS / (ORBIT_RADIUS**3));

// Moon constants
export const MOON_SCALE = 0.273;
export const MOON_ORBIT_RADIUS = 5;

// X-Wing movement
export const MOVE_SPEED = 10;

// Visual constants
export const ORBIT_SEGMENTS = 128;              // more = smoother for orbit line

// Space environment constants
export const STAR_FIELD_RADIUS = 800;           // size of the star field sphere
export const STAR_COUNT = 8000;                 // number of stars in the field
export const STAR_SIZE_MIN = 0.1;               // minimum star size
export const STAR_SIZE_MAX = 0.8;               // maximum star size
export const BRIGHT_STARS_PERCENTAGE = 0.05;    // percentage of bright stars
