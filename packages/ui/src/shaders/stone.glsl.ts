/**
 * TidKit Shared - Stone Pattern GLSL Shader
 * Voronoi-based stone patterns: coursed, random/rubble, cobblestone.
 */

export const stoneFragmentGLSL = /* glsl */ `
// Stone uniforms
uniform int uStoneLayout;        // 0=coursed, 1=random, 2=cobblestone
uniform float uStoneSize;        // inches
uniform float uSizeVariation;    // 0-1
uniform vec3 uStoneColorA;
uniform vec3 uStoneColorB;
uniform vec3 uStoneColorC;
uniform vec3 uStoneMortarColor;
uniform float uStoneMortarWidth; // inches
uniform float uSurfaceRoughness; // 0-1
uniform float uGrainIntensity;   // 0-1

// Voronoi cell result
struct VoronoiResult {
  float dist;       // distance to nearest cell edge
  vec2 cellId;      // cell center ID for coloring
  float cellDist;   // distance to cell center
};

VoronoiResult voronoi2D(vec2 uv) {
  vec2 iuv = floor(uv);
  vec2 fuv = fract(uv);

  float minDist = 8.0;
  float secondDist = 8.0;
  vec2 nearestId = vec2(0.0);
  float nearestCellDist = 8.0;

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 neighbor = vec2(float(x), float(y));
      vec2 cellId = iuv + neighbor;
      vec2 point = hash22(cellId);
      vec2 diff = neighbor + point - fuv;
      float d = dot(diff, diff);

      if (d < minDist) {
        secondDist = minDist;
        minDist = d;
        nearestId = cellId;
        nearestCellDist = sqrt(d);
      } else if (d < secondDist) {
        secondDist = d;
      }
    }
  }

  VoronoiResult res;
  res.dist = sqrt(secondDist) - sqrt(minDist); // edge distance
  res.cellId = nearestId;
  res.cellDist = nearestCellDist;
  return res;
}

struct StoneResult {
  vec3 color;
  float roughness;
  float mortar;
  vec3 normal;
};

StoneResult evaluateStone(vec2 uv) {
  StoneResult result;

  // Scale UV by stone size
  float scale = 1.0 / uStoneSize;
  vec2 stoneUV = uv * scale;

  // Adjust UV based on layout
  if (uStoneLayout == 0) {
    // Coursed: row-aligned grid with horizontal jitter
    float row = floor(stoneUV.y);
    float rowJitter = hash21(vec2(row, 0.0)) * 0.3;
    // Slightly stretch horizontally for rectangular coursed stones
    stoneUV.x *= 0.6;
    stoneUV.x += rowJitter;
  } else if (uStoneLayout == 2) {
    // Cobblestone: hexagonal grid offset
    float row = floor(stoneUV.y * 1.15);
    stoneUV.x += mod(row, 2.0) * 0.5;
    stoneUV *= 1.15;
  }
  // Layout 1 (random): use UV as-is for fully irregular cells

  VoronoiResult vor = voronoi2D(stoneUV);

  // Mortar: thin lines at cell edges
  float mortarFrac = uStoneMortarWidth * scale;
  float mortar = 1.0 - smoothstep(mortarFrac * 0.5, mortarFrac * 1.5, vor.dist);
  result.mortar = mortar;

  // Per-cell color from 3-color palette
  float cellHash = hash21(vor.cellId);
  vec3 stoneColor;
  if (cellHash < 0.33) {
    stoneColor = mix(uStoneColorA, uStoneColorB, cellHash * 3.0);
  } else if (cellHash < 0.66) {
    stoneColor = mix(uStoneColorB, uStoneColorC, (cellHash - 0.33) * 3.0);
  } else {
    stoneColor = mix(uStoneColorC, uStoneColorA, (cellHash - 0.66) * 3.0);
  }

  // Add surface grain noise per cell
  float grain = snoise(uv * 2.0 + vor.cellId * 10.0) * uGrainIntensity * 0.15;
  stoneColor += vec3(grain);

  // Size variation darkening (larger = slightly darker impression)
  float sizeVar = hash21(vor.cellId + 100.0) * uSizeVariation * 0.1;
  stoneColor -= vec3(sizeVar);

  // Mix with mortar
  result.color = mix(stoneColor, uStoneMortarColor, mortar);

  // Roughness with per-cell variation
  float cellRoughness = uSurfaceRoughness + (hash21(vor.cellId + 50.0) - 0.5) * 0.2;
  result.roughness = mix(clamp(cellRoughness, 0.0, 1.0), uSurfaceRoughness * 0.8, mortar);

  // Normal perturbation from Voronoi edges
  float edgeBump = smoothstep(mortarFrac * 2.0, mortarFrac * 0.5, vor.dist);
  float nx = dFdx(vor.dist) * 3.0;
  float ny = dFdy(vor.dist) * 3.0;
  result.normal = normalize(vec3(nx, ny, 1.0 - edgeBump * 0.3));

  return result;
}
`;
