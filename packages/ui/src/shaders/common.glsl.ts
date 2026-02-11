/**
 * TidKit Shared - Common GLSL Helpers
 * Hash functions, smoothstep helpers, varying declarations shared by all shaders.
 */

/** Vertex shader additions: pass world position and normal to fragment */
export const commonVertexGLSL = /* glsl */ `
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;

void main() {
  vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
  vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
}
`;

/** Fragment shader common utilities */
export const commonFragmentGLSL = /* glsl */ `
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;

// Hash function for per-cell random values
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec2 hash22(vec2 p) {
  vec3 a = fract(p.xyx * vec3(123.34, 234.34, 345.65));
  a += dot(a, a + 34.45);
  return fract(vec2(a.x * a.y, a.y * a.z));
}

vec3 hash23(vec2 p) {
  vec3 a = fract(p.xyx * vec3(123.34, 234.34, 345.65));
  a += dot(a, a + 34.45);
  return fract(vec3(a.x * a.y, a.y * a.z, a.z * a.x));
}

// Hex to linear color conversion helper (colors are passed as vec3 0-1)
vec3 mixColors(vec3 a, vec3 b, float t) {
  return mix(a, b, clamp(t, 0.0, 1.0));
}

// Smooth pulse: returns 1.0 inside [edge0, edge1] with smooth transitions
float smoothPulse(float edge0, float edge1, float x, float smoothness) {
  return smoothstep(edge0 - smoothness, edge0 + smoothness, x)
       - smoothstep(edge1 - smoothness, edge1 + smoothness, x);
}
`;
