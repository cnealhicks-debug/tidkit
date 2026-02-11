/**
 * TidKit Builder - Brick Pattern GLSL Shader
 * Fully parameterized brick with bond patterns, mortar, per-brick color variation.
 */

export const brickFragmentGLSL = /* glsl */ `
// Brick uniforms
uniform int uBondPattern;      // 0=running, 1=stack, 2=stretcher, 3=flemish
uniform float uBrickWidth;     // inches
uniform float uBrickHeight;    // inches
uniform float uMortarWidth;    // inches
uniform float uMortarDepth;    // 0-1
uniform vec3 uBrickColorA;
uniform vec3 uBrickColorB;
uniform vec3 uMortarColor;
uniform float uColorVariation;
uniform float uBrickRoughness;
uniform float uMortarRoughness;

// Evaluate brick pattern for a single 2D UV coordinate
// Returns: vec4(color.rgb, roughness)
// Also outputs mortar mask via mortarOut (1.0 = mortar, 0.0 = brick)
struct BrickResult {
  vec3 color;
  float roughness;
  float mortar;       // 0-1 mortar mask
  vec3 normal;        // normal perturbation
};

BrickResult evaluateBrick(vec2 uv) {
  BrickResult result;

  // Convert UV from world-scale to brick-scale
  float cellW = uBrickWidth + uMortarWidth;
  float cellH = uBrickHeight + uMortarWidth;

  // Scale UV to brick cells
  vec2 scaledUV = uv / vec2(cellW, cellH);

  // Row index for offset calculation
  float row = floor(scaledUV.y);

  // Bond pattern offset
  float offset = 0.0;
  if (uBondPattern == 0) {
    // Running bond: every other row offset by half
    offset = mod(row, 2.0) * 0.5;
  } else if (uBondPattern == 1) {
    // Stack bond: no offset
    offset = 0.0;
  } else if (uBondPattern == 2) {
    // Stretcher bond: same as running (1/2 offset)
    offset = mod(row, 2.0) * 0.5;
  } else if (uBondPattern == 3) {
    // Flemish bond: alternating full/half bricks
    offset = mod(row, 2.0) * 0.5;
  }

  vec2 brickUV = vec2(scaledUV.x + offset, scaledUV.y);

  // Local position within brick cell (0-1)
  vec2 cellPos = fract(brickUV);

  // Mortar mask: check if we're in the mortar region
  float mortarFracX = uMortarWidth / cellW;
  float mortarFracY = uMortarWidth / cellH;
  float smoothEdge = 0.005; // small smoothstep for anti-aliasing

  float mortarX = 1.0 - smoothstep(mortarFracX - smoothEdge, mortarFracX + smoothEdge, cellPos.x);
  float mortarY = 1.0 - smoothstep(mortarFracY - smoothEdge, mortarFracY + smoothEdge, cellPos.y);
  float mortar = max(mortarX, mortarY);

  result.mortar = mortar;

  // Brick ID for per-brick color variation
  vec2 brickId = floor(brickUV);
  float brickHash = hash21(brickId);

  // Per-brick color: mix between colorA and colorB based on hash
  float colorMix = brickHash * uColorVariation;
  vec3 brickColor = mix(uBrickColorA, uBrickColorB, colorMix);

  // Add subtle per-brick noise for natural variation
  float brickNoise = snoise(brickId * 7.31) * 0.05 * uColorVariation;
  brickColor += vec3(brickNoise);

  // Mix brick and mortar colors
  result.color = mix(brickColor, uMortarColor, mortar);

  // Roughness: different for brick face vs mortar
  result.roughness = mix(uBrickRoughness, uMortarRoughness, mortar);

  // Normal perturbation: mortar is recessed
  // Create a slight bump at mortar edges
  float bumpX = smoothstep(mortarFracX - 0.02, mortarFracX, cellPos.x)
              - smoothstep(mortarFracX, mortarFracX + 0.02, cellPos.x);
  float bumpY = smoothstep(mortarFracY - 0.02, mortarFracY, cellPos.y)
              - smoothstep(mortarFracY, mortarFracY + 0.02, cellPos.y);

  result.normal = vec3(bumpX * uMortarDepth * 0.5, bumpY * uMortarDepth * 0.5, 1.0);
  result.normal = normalize(result.normal);

  return result;
}
`;
