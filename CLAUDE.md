# CLAUDE.md

## Project Overview
TidKit is a 3D building generator suite for tabletop gaming terrain. Turborepo monorepo with Next.js 14 and React Three Fiber.

## Structure
```
apps/
  builder/     # 3D building generator (@tidkit/builder)
  studio/      # Texture processing tool (@tidkit/studio)
  web/         # Marketing homepage (@tidkit/web)
packages/
  ui/          # Shared components, hooks, theming
  auth/        # Authentication (OAuth, CloudKit)
  storage/     # File storage providers
  config/      # Shared configuration
  database/    # Prisma schema
```

## Commands
```bash
pnpm install          # Install dependencies
pnpm dev              # Run all apps (ports 3000, 3001, 3002)
pnpm build            # Build all apps
pnpm turbo build --filter=@tidkit/builder  # Build specific app
```

## Key Files
- `apps/builder/src/stores/buildingStore.ts` - Main state management
- `apps/builder/src/types/building.ts` - Type definitions
- `apps/builder/src/components/building/` - UI panels
- `apps/builder/src/components/3d/` - Three.js components
- `packages/ui/src/components/` - Shared UI components

## Tech Stack
- Next.js 14 (App Router)
- React Three Fiber + Drei
- Zustand (state management)
- Tailwind CSS
- TypeScript
- pnpm workspaces

## Deployment
- Vercel (3 projects: tidkit, tidkit-builder, tidkit-studio)
- Domain: tidkit.com with rewrites to subapps

## Specialized Agents
Use these for focused work:
- `.claude/agents/builder-dev.md` - Builder app (3D, controls, export)
- `.claude/agents/studio-dev.md` - Studio app (textures, image processing)
- `.claude/agents/ui-dev.md` - Shared UI package (components, hooks, theming)
- `.claude/agents/full-stack.md` - Cross-cutting features and architecture
