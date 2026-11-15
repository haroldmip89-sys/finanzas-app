# Autenticación con Clerk

Estado: hecha

## Objetivo

Proteger la app con Clerk: registro e inicio de sesión, rutas autenticadas y un helper único para obtener el `userId` en el servidor. Es la base de la propiedad de datos por usuario (`system-design.md §3`, `§5`, `§6`; invariante 1 de `§2`).

Decisión de diseño (corrige `system-design.md §6`): en Next 16 el archivo es `src/proxy.ts` (antes `middleware.ts`). Con `@clerk/nextjs` 7, `clerkMiddleware()` va **sin** reglas de rutas y solo expone la sesión a `auth()`; la protección se hace con `await auth.protect()` en cada página, route handler y server action. `createRouteMatcher` está deprecado y no se usa.

## Alcance

- Incluye:
  - Instalar `@clerk/nextjs` y envolver la app con `ClerkProvider`.
  - `src/proxy.ts` con `clerkMiddleware()` y el matcher estándar (incluye `/(api|trpc)(.*)`).
  - Páginas `/sign-in` y `/sign-up` con los componentes `SignIn` y `SignUp` de Clerk, públicas.
  - Helper `requireUserId()` en `src/lib/auth.ts`, con test.
  - Área autenticada: layout con header (marca + `UserButton`) y página `/dashboard` placeholder protegida.
  - Landing `/` pública mínima con enlaces a sign-in/sign-up; un usuario con sesión es redirigido a `/dashboard`.
  - Layout responsive (360 px en adelante) usando solo tokens semánticos de color.
- No incluye:
  - Tema dark por defecto, toggle claro/oscuro y `appearance` de Clerk (spec 001b).
  - Base de datos, tablas, sincronización de usuarios o webhooks de Clerk (spec 002; no se usan en el MVP, `system-design.md §3`).
  - Organizaciones, roles, onboarding, login social personalizado.
  - Navegación completa (sidebar / barra inferior) de la spec 001b.

## Reutilizar

- `src/components/ui/button.tsx` (shadcn) para los enlaces de la landing; no crear botones nuevos.
- `src/lib/utils.ts` (`cn`).
- Patrón de referencia: `../nexora-app/src/proxy.ts` (sin la parte de CSP, que no aplica aquí).
- Nada existente en `src/modules/*` (carpeta aún no creada).

## Archivos

Nuevos:

- `src/proxy.ts`
- `src/lib/auth.ts`
- `src/lib/auth.test.ts`
- `src/app/sign-in/[[...sign-in]]/page.tsx`
- `src/app/sign-up/[[...sign-up]]/page.tsx`
- `src/modules/auth/components/auth-page-layout.tsx` (contenedor centrado responsive para sign-in / sign-up)
- `src/modules/auth/components/app-header.tsx` (marca + `UserButton`)
- `src/app/(app)/layout.tsx`
- `src/app/(app)/dashboard/page.tsx`

Modificados:

- `package.json`, `package-lock.json` (dependencia `@clerk/nextjs`)
- `src/app/layout.tsx` (`ClerkProvider`; título y metadata de la app)
- `src/app/page.tsx` (landing mínima + redirección si hay sesión)

Variables de entorno: ya documentadas en `.env.example` (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL`, `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL`). Los valores reales van solo en `.env.local`.

## Criterios de aceptación

- AC1: `src/app/layout.tsx` envuelve la app con `ClerkProvider`; `package.json` declara `@clerk/nextjs` 7.x.
- AC2: `src/proxy.ts` exporta `clerkMiddleware()` sin reglas de ruta ni `createRouteMatcher`, con el matcher que incluye `/(api|trpc)(.*)` y excluye `_next` y estáticos.
- AC3: `/sign-in` y `/sign-up` son accesibles sin sesión y muestran los componentes `SignIn` / `SignUp`.
- AC4: sin sesión, abrir `/dashboard` redirige a `/sign-in`.
- AC5: con sesión, abrir `/` redirige a `/dashboard`; tras iniciar o crear sesión el usuario llega a `/dashboard`.
- AC6: `requireUserId()` devuelve el `userId` de Clerk usando `await auth.protect()`; sin sesión delega el comportamiento de `auth.protect()` (redirige en páginas, 401 en server actions, 404 en route handlers). Nunca recibe el `userId` desde el cliente.
- AC7: `/dashboard` llama a `await auth.protect()` en la propia página, además del layout; el layout nunca es la única defensa.
- AC8: el header autenticado muestra `UserButton`; cerrar sesión vuelve a `/`.
- AC9: ninguna pantalla tiene scroll horizontal a 360, 768 y 1280 px; no hay colores fijos, solo tokens (`bg-background`, `text-foreground`, etc.).
- AC10: `npm run lint`, `npm run test` y `npm run build` pasan; `.env.local` no queda en git.

## Tests requeridos

(Vitest, junto al archivo)

- `src/lib/auth.test.ts`: con `@clerk/nextjs/server` mockeado, `requireUserId()` (a) devuelve el `userId` que entrega `auth.protect()`, (b) propaga el error/redirección de `auth.protect()` cuando no hay sesión.
- Componentes y páginas de `src/app` son composición presentacional: sin test unitario. Se verifican manualmente (AC3–AC5, AC7–AC9).

## Tareas

### T0 — Dependencia, proxy y provider
- Archivos: `package.json`, `package-lock.json`, `src/proxy.ts`, `src/app/layout.tsx`
- Depende de: —
- Paralelizable: no (toca archivos compartidos: instalación de dependencias y layout raíz)
- Cubre: AC1, AC2

### T1 — Helper `requireUserId`
- Archivos: `src/lib/auth.ts`, `src/lib/auth.test.ts`
- Depende de: T0
- Paralelizable: sí
- Cubre: AC6, AC10

### T2 — Páginas sign-in / sign-up
- Archivos: `src/app/sign-in/[[...sign-in]]/page.tsx`, `src/app/sign-up/[[...sign-up]]/page.tsx`, `src/modules/auth/components/auth-page-layout.tsx`
- Depende de: T0
- Paralelizable: sí
- Cubre: AC3, AC9

### T3 — Área autenticada y landing
- Archivos: `src/modules/auth/components/app-header.tsx`, `src/app/(app)/layout.tsx`, `src/app/(app)/dashboard/page.tsx`, `src/app/page.tsx`
- Depende de: T0, T1
- Paralelizable: sí (con T2: archivos disjuntos)
- Cubre: AC4, AC5, AC7, AC8, AC9

## Preguntas abiertas

1. **Claves de Clerk.** Para verificar AC3–AC8 hacen falta `pk_test_` / `sk_test_` reales en `.env.local` (las crea el usuario en el dashboard de Clerk). Con claves de formato válido pero falsas, `npm run build` pasa; el flujo de login no se puede probar.
2. **Métodos de acceso.** Por defecto: email + contraseña (o código por email) y Google, configurados en el dashboard de Clerk, sin código adicional. ¿Se habilita Google?
3. **Redirects.** `.env.example` fija el redirect post sign-in/sign-up en `/`, y la landing reenvía a `/dashboard`. ¿Se prefiere apuntar directo a `/dashboard`? (Hoy se mantiene `/`.)
4. **Idioma de la UI de Clerk.** Por defecto en inglés. Localizar a español (`@clerk/localizations`, `esES`) puede entrar en la spec 001b si se desea.

## Próximas fases

- 001b: tema dark por defecto + toggle claro/oscuro, `appearance` de Clerk según tema, shell responsive (sidebar / navegación inferior).
- 002: Neon + Drizzle, esquema y migraciones; `requireUserId()` se usa en todas las consultas.
