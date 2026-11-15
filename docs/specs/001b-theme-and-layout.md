# Tema dark/light y shell responsive

Estado: hecha

## Objetivo

Que la app arranque en tema oscuro, se pueda cambiar a claro (y a "sistema") desde un botón, y tenga un shell autenticado totalmente responsive: sidebar en escritorio, barra superior + navegación inferior en móvil. Cumple los principios 6 de `docs/BRIEF.md §5` (responsive y dark siempre) y el alcance de `BRIEF.md §2`.

Decisión de diseño (corrige `BRIEF.md §2`): los componentes de Clerk siguen el tema usando el tema `shadcn` de `@clerk/ui` y su CSS (`@import '@clerk/ui/themes/shadcn.css'`), que lee los tokens CSS de la app. Así cambian solos con la clase `.dark`, sin lógica por tema ni `baseTheme`.

## Alcance

- Incluye:
  - `next-themes` con `attribute="class"`, `defaultTheme="dark"`, opciones oscuro / claro / sistema, sin parpadeo inicial.
  - `ThemeToggle` (menú con las 3 opciones) visible en landing, sign-in, sign-up y área autenticada.
  - Clerk (`SignIn`, `SignUp`, `UserButton`) con el tema `shadcn` de `@clerk/ui`.
  - Shell autenticado responsive: sidebar fija desde `md` (768 px); por debajo, top bar + bottom nav fija.
  - Configuración de navegación en un solo archivo, con las rutas que existen hoy (`/dashboard`).
  - `html lang="es"`.
  - Reemplazo del `app-header.tsx` de la spec 001 por el nuevo shell.
- No incluye:
  - Persistir la preferencia de tema en Neon o Clerk (solo navegador).
  - Paleta de marca personalizada: se usan los tokens neutros actuales de `globals.css`.
  - Entradas de navegación de módulos que aún no existen (transacciones, presupuestos, cuentas): cada spec de módulo agrega la suya a `nav-items.ts`.
  - Localización de la UI de Clerk (ver preguntas abiertas).

## Reutilizar

- Tokens `:root` y `.dark` de `src/app/globals.css` (incluye `--sidebar*`); `@custom-variant dark` ya existe.
- `src/components/ui/button.tsx` (`Button`, `buttonVariants`).
- `src/modules/auth/components/auth-page-layout.tsx` (se extiende, no se recrea).
- `src/lib/utils.ts` (`cn`), iconos `lucide-react` (`Sun`, `Moon`, `Monitor`, `LayoutDashboard`).
- shadcn: `dropdown-menu` no existe todavía en `src/components/ui`; se agrega con `npx shadcn@latest add dropdown-menu` (T0). No se construye un menú propio.

## Archivos

Nuevos:

- `src/components/ui/dropdown-menu.tsx` (generado por la CLI de shadcn)
- `src/components/shared/theme-provider.tsx`
- `src/components/shared/theme-toggle.tsx`
- `src/modules/shell/nav-items.ts`
- `src/modules/shell/nav-items.test.ts`
- `src/modules/shell/components/app-sidebar.tsx`
- `src/modules/shell/components/top-bar.tsx`
- `src/modules/shell/components/bottom-nav.tsx`
- `src/modules/shell/components/nav-link.tsx`

Modificados:

- `package.json`, `package-lock.json` (`next-themes`, `@clerk/ui`)
- `src/app/globals.css` (import de `@clerk/ui/themes/shadcn.css`)
- `src/app/layout.tsx` (`ThemeProvider`, `appearance` de Clerk, `lang="es"`, `suppressHydrationWarning`)
- `src/app/(app)/layout.tsx` (usa el shell nuevo)
- `src/app/page.tsx` (agrega `ThemeToggle`)
- `src/modules/auth/components/auth-page-layout.tsx` (agrega `ThemeToggle`)

Eliminados:

- `src/modules/auth/components/app-header.tsx`

## Criterios de aceptación

- AC1: en la primera visita (sin preferencia guardada) la app se muestra en oscuro, aunque el sistema operativo esté en claro, y no hay parpadeo de tema al cargar.
- AC2: `ThemeToggle` ofrece Oscuro, Claro y Sistema; el cambio es inmediato y persiste tras recargar. Está disponible en `/`, `/sign-in`, `/sign-up` y en el área autenticada.
- AC3: la opción Sistema sigue `prefers-color-scheme` y reacciona si el sistema cambia.
- AC4: `SignIn`, `SignUp` y el menú de `UserButton` cambian con el tema sin código adicional por tema (tema `shadcn` de `@clerk/ui`).
- AC5: no hay colores fijos en `src/app`, `src/modules` ni `src/components` (fuera de `ui/`): sin `zinc`, `slate`, `gray`, `bg-white`, `text-black` ni hex; solo tokens semánticos.
- AC6: desde 768 px el área autenticada muestra una sidebar fija a la izquierda (marca, navegación, `ThemeToggle` y `UserButton`) y no hay barra inferior.
- AC7: por debajo de 768 px hay top bar (marca, `ThemeToggle`, `UserButton`) y bottom nav fija; el contenido no queda oculto bajo la barra inferior (padding con `env(safe-area-inset-bottom)`); los destinos táctiles miden al menos 44 px.
- AC8: el enlace activo se resalta visualmente y tiene `aria-current="page"`.
- AC9: no hay scroll horizontal a 360, 768 y 1280 px en `/`, `/sign-in`, `/sign-up` y `/dashboard`, en ambos temas.
- AC10: el texto normal cumple contraste AA (4.5:1) en claro y oscuro con los tokens usados; el foco por teclado es visible en enlaces, botones y menú.
- AC11: `<html lang="es">`.
- AC12: `app-header.tsx` está eliminado y sin referencias; `npm run lint`, `npm run test` y `npm run build` pasan.

## Tests requeridos

(Vitest, junto al archivo)

- `src/modules/shell/nav-items.test.ts`: la función `isActive(pathname, href)` marca activo en coincidencia exacta y en subrutas (`/transactions/new` activa `/transactions`), no marca por prefijo parcial (`/dash` no activa `/dashboard`) y trata `/` solo por coincidencia exacta.
- Componentes (`theme-toggle`, `app-sidebar`, `top-bar`, `bottom-nav`, `nav-link`) y páginas son presentacionales: sin test unitario; se verifican manualmente (AC1–AC10).

## Tareas

### T0 — Base: dependencias, provider y layout raíz
- Archivos: `package.json`, `package-lock.json`, `src/components/ui/dropdown-menu.tsx`, `src/app/globals.css`, `src/components/shared/theme-provider.tsx`, `src/app/layout.tsx`
- Depende de: —
- Paralelizable: no (instala dependencias, toca `globals.css`, el layout raíz y `ui/`)
- Cubre: AC1, AC3, AC4, AC11

### T1 — ThemeToggle
- Archivos: `src/components/shared/theme-toggle.tsx`
- Depende de: T0
- Paralelizable: no (T2 y T3 lo consumen)
- Cubre: AC2

### T2 — Shell autenticado responsive
- Archivos: `src/modules/shell/nav-items.ts`, `src/modules/shell/nav-items.test.ts`, `src/modules/shell/components/app-sidebar.tsx`, `src/modules/shell/components/top-bar.tsx`, `src/modules/shell/components/bottom-nav.tsx`, `src/modules/shell/components/nav-link.tsx`, `src/app/(app)/layout.tsx`, `src/modules/auth/components/app-header.tsx` (eliminar)
- Depende de: T1
- Paralelizable: sí (con T3: archivos disjuntos)
- Cubre: AC5, AC6, AC7, AC8, AC9, AC10, AC12

### T3 — Toggle en páginas públicas
- Archivos: `src/app/page.tsx`, `src/modules/auth/components/auth-page-layout.tsx`
- Depende de: T1
- Paralelizable: sí (con T2)
- Cubre: AC2, AC5, AC9

## Preguntas abiertas

1. **Idioma de la UI de Clerk.** Sigue en inglés. Pasarla a español con `@clerk/localizations` (`esES`) es un cambio de una línea en `layout.tsx`; si se quiere, se agrega a T0. Pendiente de la spec 001.
2. **Navegación con un solo destino.** Hoy solo existe `/dashboard`, así que la barra inferior tendrá una entrada hasta que lleguen transacciones, presupuestos y cuentas. Se acepta para no inventar rutas (YAGNI).
3. **Ubicación del toggle en móvil.** Por defecto en la top bar. Alternativa: dentro del menú de usuario.
4. **Tema por dispositivo.** La preferencia vive en el navegador; cambiar de dispositivo vuelve al oscuro por defecto. Guardarla en Neon queda fuera del MVP.

## Próximas fases

- 002: Neon + Drizzle, esquema y migraciones.
- Cada spec de módulo (003 en adelante) agrega su entrada a `src/modules/shell/nav-items.ts` y debe cumplir los criterios responsive y dark de `BRIEF.md §5`.
