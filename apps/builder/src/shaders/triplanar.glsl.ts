/**
 * TidKit Builder - Triplanar UV Mapping
 * Projects textures seamlessly across all surfaces using world-space coordinates.
 * High-exponent blending (pow 8.0) ensures clean axis-aligned surfaces.
 */

export const triplanarGLSL = /* glsl */ `
// Compute triplanar blend weights from world normal
vec3 triplanarWeights(vec3 worldNormal) {
  vec3 w = abs(worldNormal);
  // Sharp blending for axis-aligned surfaces (architectural buildings)
  w = pow(w, vec3(8.0));
  w /= (w.x + w.y + w.z + 0.0001);
  return w;
}

// Get 2D UV coordinates for each axis projection
// X-axis projection: uses worldPos.zy (side walls)
// Y-axis projection: uses worldPos.xz (floors/roofs)
// Z-axis projection: uses worldPos.xy (front/back walls)
struct TriplanarUVs {
  vec2 uvX; // side walls
  vec2 uvY; // floors/roofs
  vec2 uvZ; // front/back walls
  vec3 weights;
};

TriplanarUVs getTriplanarUVs(vec3 worldPos, vec3 worldNormal, float scale) {
  TriplanarUVs result;
  result.uvX = worldPos.zy * scale;
  result.uvY = worldPos.xz * scale;
  result.uvZ = worldPos.xy * scale;
  result.weights = triplanarWeights(worldNormal);
  return result;
}

// Blend three values using triplanar weights
vec3 triplanarBlend(vec3 valX, vec3 valY, vec3 valZ, vec3 weights) {
  return valX * weights.x + valY * weights.y + valZ * weights.z;
}

float triplanarBlendFloat(float valX, float valY, float valZ, vec3 weights) {
  return valX * weights.x + valY * weights.y + valZ * weights.z;
}
`;
