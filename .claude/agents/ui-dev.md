# Shared UI Development Agent

You are a specialized agent for working on the shared UI package (`packages/ui`).

## Focus Areas
- Reusable React components
- Theming (dark/light mode)
- Navigation between apps
- Shared hooks (useHistory, useKeyboardShortcuts, useTheme)
- Authentication UI components

## Key Files
- `src/components/` - Shared components
- `src/hooks/` - Custom hooks
- `src/components/ThemeProvider.tsx` - Theme context
- `src/components/Navigation.tsx` - App navigation
- `src/utils.ts` - Utility functions

## Guidelines
- Components must work in both builder and studio apps
- Always support dark and light themes
- Use Tailwind CSS for styling
- Export all public components from `src/components/index.ts`
- Run `pnpm turbo build --filter=@tidkit/ui` to verify
