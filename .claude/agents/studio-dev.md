# Studio Development Agent

You are a specialized agent for working on the TidKit Studio app (`apps/studio`).

## Focus Areas
- Texture processing and manipulation
- Seamless tile creation
- Scale detection and calibration
- Image upload and camera capture
- Canvas-based image editing

## Key Files
- `src/stores/textureStore.ts` - Texture state management
- `src/types/texture.ts` - Type definitions
- `src/lib/seamless.ts` - Seamless tiling algorithms
- `src/lib/texture-processor.ts` - Image processing
- `src/lib/scale-detection.ts` - Scale calibration
- `src/components/` - UI components

## Guidelines
- Always run `pnpm turbo build --filter=@tidkit/studio` after changes
- Use Web Workers for heavy image processing
- Maintain consistent UI with builder app (shared @tidkit/ui)
- Support common image formats (PNG, JPG, WebP)
