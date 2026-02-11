/**
 * TidKit Shared - Weathering Layer GLSL Shader
 * Five compositable weathering effects applied as final post-process.
 */

export const weatheringFragmentGLSL = /* glsl */ `
// Weathering uniforms
uniform bool uWeatheringEnabled;
uniform float uDirtIntensity;
uniform vec3 uDirtColor;
uniform float uWaterStainIntensity;
uniform float uMossIntensity;
uniform vec3 uMossColor;
uniform float uAgeFactor;
uniform float uEdgeWearIntensity;

// Apply all weathering layers to a base color
// worldPos: world-space position of the fragment
// mortar: mortar mask (0-1) from base pattern — moss concentrates here
vec3 applyWeathering(vec3 baseColor, vec3 worldPos, float mortar, float baseRoughness) {
  if (!uWeatheringEnabled) return baseColor;

  vec3 color = baseColor;

  // 1. Dirt accumulation: darker at lower Y (gravity effect)
  if (uDirtIntensity > 0.001) {
    // Normalize Y: 0 at ground, 1 at ~20ft up (typical building height)
    float heightFactor = 1.0 - clamp(worldPos.y / 20.0, 0.0, 1.0);
    heightFactor = pow(heightFactor, 2.0); // concentrate at base
    // Add noise for irregular dirt patches
    float dirtNoise = snoise(worldPos.xz * 0.5 + vec2(7.3, 2.1)) * 0.5 + 0.5;
    float dirt = heightFactor * dirtNoise * uDirtIntensity;
    color = mix(color, uDirtColor, dirt * 0.6);
  }

  // 2. Water staining: vertical streaks from top edges
  if (uWaterStainIntensity > 0.001) {
    float heightFactor = clamp(worldPos.y / 15.0, 0.0, 1.0);
    // Vertical noise streaks
    float streak = snoise(vec2(worldPos.x * 3.0, worldPos.y * 0.2)) * 0.5 + 0.5;
    streak *= snoise(vec2(worldPos.x * 8.0, worldPos.y * 0.5 + 100.0)) * 0.5 + 0.5;
    float stain = streak * heightFactor * uWaterStainIntensity;
    // Water stains darken slightly
    color = mix(color, color * 0.7, stain * 0.4);
  }

  // 3. Moss/lichen: noise patches concentrated in mortar joints
  if (uMossIntensity > 0.001) {
    float mossNoise = snoise(worldPos.xz * 1.5 + vec2(42.0, 13.0)) * 0.5 + 0.5;
    mossNoise *= snoise(worldPos.xy * 0.8 + vec2(7.0, 99.0)) * 0.5 + 0.5;
    // Concentrate in mortar joints and at base
    float heightBias = 1.0 - clamp(worldPos.y / 10.0, 0.0, 0.8);
    float mortarBias = mix(0.3, 1.0, mortar);
    float moss = mossNoise * mortarBias * heightBias * uMossIntensity;
    color = mix(color, uMossColor, clamp(moss, 0.0, 0.7));
  }

  // 4. Aging/fade: desaturation + slight lightening
  if (uAgeFactor > 0.001) {
    float luma = dot(color, vec3(0.299, 0.587, 0.114));
    vec3 desaturated = vec3(luma);
    // Partially desaturate
    color = mix(color, desaturated, uAgeFactor * 0.5);
    // Slight lightening (sun bleaching)
    color = mix(color, color * 1.15, uAgeFactor * 0.3);
  }

  // 5. Edge wear: subtle darkening at geometric edges
  if (uEdgeWearIntensity > 0.001) {
    // Use screen-space derivatives as edge proxy
    float dx = length(dFdx(worldPos));
    float dy = length(dFdy(worldPos));
    float edgeFactor = clamp((dx + dy) * 5.0 - 0.5, 0.0, 1.0);
    color = mix(color, color * 0.75, edgeFactor * uEdgeWearIntensity * 0.5);
  }

  return color;
}
`;
