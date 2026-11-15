# Endurecimiento y despliegue

Estado: hecha (aprobada por delegación del usuario para continuar sin supervisión)

## Objetivo

Dejar la app lista para desplegarla en Vercel + Neon con una base razonable de seguridad y resiliencia, **sin desplegar nada** (el despliegue y la aplicación de migraciones a Neon los hace el usuario, con su OK).

## Alcance

- Incluye:
  - **Auditoría** de los límites de confianza: toda acción usa `requireUserId()` y valida con Zod; toda consulta de servicio filtra por `userId`; no hay secretos en variables `NEXT_PUBLIC_*` ni HTML inyectado. Resultado en las notas.
  - **Cabeceras de seguridad** en `next.config.ts`: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, `Strict-Transport-Security`; sin cabecera `X-Powered-By`.
  - **Páginas de error y no encontrado:** `not-found.tsx`, `global-error.tsx` y un `error.tsx` general para las pantallas autenticadas, en español y con tono calmado.
  - **Documentación de despliegue** `docs/DEPLOY.md`: variables, Clerk de producción, migraciones pendientes (0003, 0004 y 0005), lista de verificación antes y después de publicar.
  - **README** del proyecto (hoy es el de la plantilla).
- No incluye: desplegar, aplicar migraciones a Neon, política CSP (requiere probar Clerk en navegador real; queda como siguiente paso), límite de peticiones (rate limiting), PWA (spec 011).

## Reglas

- Las cabeceras no deben romper Clerk ni las fuentes de Google ya servidas por Next; por eso no se activa CSP aquí.
- Los errores no muestran detalles internos; solo un mensaje y un botón para reintentar.
- Cualquier migración se aplica a Neon solo con OK explícito del usuario.

## Archivos

- `next.config.ts` (+ test), `src/app/not-found.tsx`, `src/app/global-error.tsx`, `src/app/(app)/error.tsx`.
- `docs/DEPLOY.md`, `README.md`.

## Criterios de aceptación

- AC1: las respuestas incluyen las cinco cabeceras y no `X-Powered-By`.
- AC2: una ruta inexistente muestra una página en español con enlace a Inicio.
- AC3: un error inesperado en una pantalla muestra mensaje calmado y "Reintentar", sin detalles técnicos.
- AC4: `docs/DEPLOY.md` lista cada variable, las migraciones pendientes y los pasos de verificación.
- AC5: `npm run lint`, `npm run test` y `npm run build` pasan.

## Tests

- `next.config.ts`: la función `headers()` devuelve las cabeceras esperadas para todas las rutas.
- Componentes de error y no encontrado: texto y acciones.

## Notas de implementación

- **Auditoría:** las 11 acciones usan `requireUserId()` y validan la entrada con Zod; los servicios filtran por `userId` en todas las consultas; no hay `dangerouslySetInnerHTML` ni secretos en `NEXT_PUBLIC_*`. Sin hallazgos.
- Las cabeceras están en `next.config.ts` y se prueban con `next.config.test.ts`. CSP y rate limiting quedan como siguientes pasos (documentados en `docs/DEPLOY.md`).
- `not-found.tsx` enlaza a `/dashboard`; `global-error.tsx` usa estilos en línea porque reemplaza el layout raíz.
- **No se desplegó ni se aplicó ninguna migración a Neon.**
