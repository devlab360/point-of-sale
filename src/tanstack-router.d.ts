import type { getRouter } from './router.tsx'

declare module '@tanstack/react-router' {
  interface Register {
    router: Awaited<ReturnType<typeof getRouter>>
  }
}
