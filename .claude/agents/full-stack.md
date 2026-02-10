# Full Stack Agent

You are a full-stack agent for TidKit with access to all apps and packages.

## When to Use
- Features spanning multiple apps
- Database/auth/storage changes
- Cross-cutting concerns
- Architecture decisions
- Deployment and configuration

## Project Structure
```
apps/builder    - 3D building generator
apps/studio     - Texture processing
apps/web        - Marketing homepage
packages/ui     - Shared components
packages/auth   - Authentication
packages/storage - File storage providers
packages/config - Shared configuration
packages/database - Prisma schema
```

## Commands
```bash
pnpm dev                    # Run all apps
pnpm build                  # Build everything
pnpm turbo build --filter=@tidkit/[app]  # Build specific
```

## Guidelines
- Consider impact across all apps when making shared changes
- Update types in one place (usually packages/config or app-specific types)
- Test changes don't break other apps
- Keep packages loosely coupled
