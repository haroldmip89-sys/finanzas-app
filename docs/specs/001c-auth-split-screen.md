# Login y registro a pantalla dividida con carrusel

Estado: hecha

## Objetivo

`/sign-in` y `/sign-up` pasan a pantalla dividida desde 1024 px, como en Nexora: a la izquierda un carrusel de imágenes que se desliza solo, a la derecha el formulario de Clerk. Es solo interfaz sobre la auth de la spec 001: no cambia `proxy.ts`, redirects, `requireUserId()` ni variables de entorno. Cumple `docs/BRIEF.md §5` (responsive y dark siempre) y las convenciones de `docs/SETUP.md §2` (lógica en hooks, componentes reutilizables).

Referencia: `../nexora-app` (`image-carousel.tsx`, `use-prefers-reduced-motion.ts`, `auth-split-layout.tsx`, spec 022e). Se adapta con una diferencia: en Nexora el estado del carrusel vive dentro del componente; aquí **toda la lógica se extrae a un hook** (`useImageCarousel`) y el componente solo renderiza.

## Alcance

- Incluye:
  - Hook `usePrefersReducedMotion` y hook `useImageCarousel` (autoplay cada 3 s, pausa por hover/foco, pausa manual, reduced-motion).
  - Componente compartido `ImageCarousel`, genérico y sin lógica de auth.
  - `AuthSplitLayout` y lista de diapositivas de auth.
  - `sign-in` y `sign-up` usando el nuevo layout; `ThemeToggle` y enlace de marca en el panel del formulario.
  - Tres imágenes en `public/auth/`.
- No incluye:
  - Cambios en auth, `proxy.ts`, redirects, `.env.example` o la spec de tema (se reutiliza `appearance={{ theme: shadcn }}` de `layout.tsx`, que ya sigue claro/oscuro).
  - Controles siguiente/anterior o indicadores de posición (YAGNI: solo Pausar/Reproducir).
  - Texto superpuesto sobre las imágenes, logo sobre la imagen.
  - Localización de Clerk (sigue en inglés).
  - Nuevas dependencias.

## Reutilizar

- `src/components/ui/button.tsx` (`Button`) para el botón Pausar/Reproducir.
- `src/components/shared/theme-toggle.tsx` (spec 001b).
- `src/modules/auth/components/auth-page-layout.tsx` se **reemplaza** por `AuthSplitLayout` (se elimina al final).
- `src/lib/utils.ts` (`cn`), `next/image`.
- De Nexora se copia y adapta la lógica de `image-carousel.tsx` y `use-prefers-reduced-motion.ts`; no existe nada equivalente en `src/`.

## Archivos

Nuevos:

- `public/auth/login-1.webp`, `public/auth/login-2.webp`, `public/auth/login-3.webp` (provisionales, ver preguntas abiertas)
- `src/hooks/use-prefers-reduced-motion.ts`
- `src/hooks/use-prefers-reduced-motion.test.ts`
- `src/hooks/use-image-carousel.ts`
- `src/hooks/use-image-carousel.test.ts`
- `src/components/shared/image-carousel.tsx`
- `src/components/shared/image-carousel.test.tsx`
- `src/modules/auth/content/auth-slides.ts`
- `src/modules/auth/components/auth-split-layout.tsx`

Modificados:

- `src/app/sign-in/[[...sign-in]]/page.tsx`
- `src/app/sign-up/[[...sign-up]]/page.tsx`

Eliminados:

- `src/modules/auth/components/auth-page-layout.tsx`

## Diseño

- `useImageCarousel({ count, intervalMs = 3000 })` devuelve `{ activeIndex, playing, animated, hoverProps, togglePlaying }`. `animated` es falso si `count < 2` o el usuario prefiere reducir movimiento; entonces no hay intervalo y el índice activo es 0. El intervalo corre solo si `animated && playing && !hovered && !focused`.
- `ImageCarousel` recibe `slides`, `sizes`, `className`; consume el hook; no tiene `useState` ni `useEffect`. Las diapositivas van en un contenedor `aria-hidden` con `alt=""` (imágenes decorativas); el botón Pausar/Reproducir queda fuera del contenedor oculto, con `aria-label` y alto mínimo de 44 px. La primera imagen carga `eager`, las demás `lazy`.
- Transición: se desliza a la izquierda (`translateX`) con `motion-safe:` y duración de 600 ms.
- `AuthSplitLayout` (componente de servidor): desde `lg` (1024 px) usa `grid-cols-2` con altura `min-h-dvh`; el panel izquierdo es `hidden lg:block` (en móvil no se muestra ni descarga las imágenes) con fondo `bg-muted` mientras cargan; el panel derecho centra el formulario, muestra un enlace de marca "Finanzas" a `/` arriba a la izquierda y el `ThemeToggle` arriba a la derecha.
- Solo tokens semánticos de color; sin hex.

## Criterios de aceptación

- AC1: desde 1024 px, `/sign-in` y `/sign-up` muestran dos columnas iguales de alto `min-h-dvh`: carrusel a la izquierda, formulario de Clerk a la derecha.
- AC2: por debajo de 1024 px solo se ve el formulario y las imágenes del carrusel no se descargan.
- AC3: el carrusel tiene 3 diapositivas, avanza cada 3 s deslizando a la izquierda en bucle; el botón Pausar/Reproducir detiene y reanuda; también se pausa mientras hay hover o foco dentro del carrusel.
- AC4: con `prefers-reduced-motion: reduce` no hay autoplay ni botón, y se ve solo la primera imagen.
- AC5: las imágenes son decorativas (`alt=""`, contenedor `aria-hidden`); el botón tiene nombre accesible y mide al menos 44 px.
- AC6: `SignIn` y `SignUp` funcionan como antes (enlaces entre ambos, redirects, `redirect_url`) y siguen el tema claro/oscuro.
- AC7: el panel del formulario incluye el enlace de marca a `/` y el `ThemeToggle`.
- AC8: no hay scroll horizontal a 360, 768 y 1280 px, en ambos temas; no hay colores fijos.
- AC9: `ImageCarousel` no contiene `useState` ni `useEffect`; toda su lógica está en `useImageCarousel`.
- AC10: `auth-page-layout.tsx` está eliminado y sin referencias; no se añaden dependencias; `npm run lint`, `npm run test` y `npm run build` pasan.

## Tests requeridos

(Vitest + RTL, junto al archivo)

- `use-prefers-reduced-motion.test.ts`: devuelve el valor de `matchMedia`, reacciona al evento `change` y es `false` si `matchMedia` no existe.
- `use-image-carousel.test.ts` (timers falsos): avanza cada `intervalMs` y vuelve a 0 tras la última; no avanza con `playing` en falso, con hover ni con foco; `togglePlaying` alterna; no anima con `count < 2` ni con reduced-motion.
- `image-carousel.test.tsx`: renderiza una imagen por diapositiva, las diapositivas están dentro de un contenedor `aria-hidden`, y el botón existe solo cuando el carrusel anima.

## Tareas

### T1 — Hooks
- Archivos: `src/hooks/use-prefers-reduced-motion.ts`, `src/hooks/use-prefers-reduced-motion.test.ts`, `src/hooks/use-image-carousel.ts`, `src/hooks/use-image-carousel.test.ts`
- Depende de: —
- Paralelizable: sí
- Cubre: AC3, AC4, AC9

### T2 — Carrusel y diapositivas
- Archivos: `src/components/shared/image-carousel.tsx`, `src/components/shared/image-carousel.test.tsx`, `src/modules/auth/content/auth-slides.ts`, `public/auth/login-1.webp`, `public/auth/login-2.webp`, `public/auth/login-3.webp`
- Depende de: T1
- Paralelizable: no
- Cubre: AC3, AC4, AC5, AC9

### T3 — Layout dividido y páginas
- Archivos: `src/modules/auth/components/auth-split-layout.tsx`, `src/app/sign-in/[[...sign-in]]/page.tsx`, `src/app/sign-up/[[...sign-up]]/page.tsx`, `src/modules/auth/components/auth-page-layout.tsx` (eliminar)
- Depende de: T2
- Paralelizable: no
- Cubre: AC1, AC2, AC6, AC7, AC8, AC10

Nota (corregida al implementar): el corte inicial era 768 px, pero la tarjeta de Clerk mide unos 400 px y no cabe en una columna de 376 px, lo que producía scroll horizontal. Por eso el corte es `lg` (1024 px).

## Preguntas abiertas

1. **Imágenes.** Las de Nexora (escritorios de trabajo) sirven como provisionales, pero no son de finanzas. ¿Las reemplazas por tres propias (cuadradas, WebP, 800 px o más, menos de 100 KB c/u) en `public/auth/`? Si no, se usan las de Nexora por ahora.
2. **Texto sobre la imagen.** Por defecto ninguno. Una frase corta por diapositiva (ej. "Controla tus gastos") se puede añadir con un campo `caption` en `auth-slides.ts`.
3. **Idioma de Clerk.** Sigue en inglés; pasar a español es una línea (`@clerk/localizations`), pendiente de decisión.

## Próximas fases

- Spec 003: módulos `categories` y `accounts` (servicios con validación, hooks, errores controlados, UI y navegación).
