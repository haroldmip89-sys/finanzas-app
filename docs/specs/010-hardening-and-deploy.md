# Endurecimiento y despliegue (Vercel + Neon)

Estado: hecha (falta aplicar la configuración de Vercel y la prueba de humo)

## Objetivo

Dejar la app lista para **usarse en serio** en Vercel + Neon: que ninguna ruta falle en blanco, que los datos de cada usuario estén protegidos de forma comprobable, que el despliegue y las migraciones tengan un procedimiento claro y que un error de producción no pierda ni exponga datos. No añade funcionalidades.

Condición de partida: la app ya está desplegada en `https://yupi-app-eight.vercel.app` con la instancia **de desarrollo** de Clerk (sin dominio propio en este MVP).

Referencias: `docs/BRIEF.md §9, §10`, `docs/architecture/system-design.md`, `docs/SETUP.md`, commit del pooling de Neon.

## Qué se revisó (estado real del código)

| Área | Hallazgo |
|---|---|
| Autorización | Las 28 server actions (7 archivos `*.actions.ts`) llaman a `requireUserId()`; las páginas llaman a `auth.protect()`; el `proxy.ts` es `clerkMiddleware()` sin lógica. Correcto, pero **no hay un test que impida que una acción nueva se olvide de protegerse**. |
| Validación | Zod en cada acción; límites de longitud y de monto (`MAX_CENTS`); restricciones y claves compuestas en la base. Correcto. |
| Errores | `runAction` convierte todo en un `ActionError` seguro y registra solo los inesperados. Hay `error.tsx` y `loading.tsx` en Movimientos, Transferencias, Cuentas, Presupuestos y Categorías; **faltan** en Inicio (`/dashboard`) y `loading` en Ajustes; **no hay** `error.tsx` global, `global-error.tsx` ni `not-found.tsx`. |
| Cabeceras | `next.config.ts` está vacío: sin cabeceras de seguridad. |
| Variables | `DATABASE_URL` y las de Clerk. `NEXT_PUBLIC_APP_URL` es opcional (por defecto la URL de Vercel) y no está en `.env.example`. No hay webhook de Clerk en el código: **no hace falta**, porque no hay tabla de usuarios (todo se filtra por el `userId` de Clerk). |
| Base de datos | Cliente Neon con `Pool` (WebSocket) documentado para usar la URL **pooled**. Las migraciones se aplican a mano con `npm run db:migrate`. |
| Dependencias | `npm audit --omit=dev`: 4 avisos moderados (`minimatch`, vía `shadcn`). No se usa `--force`. |
| Pruebas / CI | Los tests (644) y el lint solo corren en local; Vercel solo ejecuta el build. |

## Decisiones (con mi recomendación)

1. **Clerk se queda en instancia de desarrollo.** La instancia de producción exige un dominio propio; sin él, se mantiene la de desarrollo (banner "Development mode" visible en el login). Se documenta la limitación y el paso a producción para cuando haya dominio.
2. **Sin webhook de Clerk.** No hay datos de usuario que sincronizar. Consecuencia documentada: si borras tu usuario en Clerk, sus datos quedan en Neon; la eliminación o exportación de datos será una spec aparte si se necesita.
3. **Una sola base de datos** (decidido): local y producción usan la misma. No se crea rama de desarrollo en Neon. Consecuencia: probar en local escribe en datos reales, así que las pruebas con datos se hacen con usuarios temporales que se borran al terminar (como hasta ahora), y las migraciones siempre son aditivas.
4. **Previews de Vercel desactivados** (decidido): solo `main` se despliega. Se configura en Vercel con un *Ignored Build Step* que omite todo lo que no sea producción, y se deja **sin `DATABASE_URL` en el entorno Preview**, de modo que un preview accidental falle en vez de tocar la base real. Si más adelante se usan ramas o pull requests, se pasa a una rama de Neon por preview.
5. **Migraciones:** siempre **aditivas y compatibles hacia atrás** (nueva columna con valor por defecto, nada de renombrar ni borrar en el mismo paso), porque migrar y desplegar no son atómicos. Orden: aplicar la migración a producción y luego desplegar.
6. **Cabeceras de seguridad básicas** (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`). **Sin CSP todavía**: Clerk exige una política muy específica y un error rompería el login; queda como mejora aparte con la guía de Clerk.
7. **Sin límite de peticiones propio:** Clerk protege el inicio de sesión y el uso es personal; se puede añadir el firewall de Vercel si hace falta.
8. **CI en GitHub Actions** (lint + tests + build en cada push) para que un error se vea antes de llegar a Vercel. *(Decisión tuya.)*

## Alcance

- Incluye:
  - **Test de protección:** recorre todos los `*.actions.ts` y falla si una función exportada no llama a `requireUserId()`.
  - **Errores y estados de carga:** `error.tsx` y `loading.tsx` en Inicio, `loading.tsx` en Ajustes, `error.tsx` global (dentro del layout), `global-error.tsx` y `not-found.tsx`, con el estilo del sistema visual, texto tranquilizador ("Tus datos están a salvo") y botón "Reintentar" o "Volver al inicio". Reutilizar el componente de error de rutas existente.
  - **Cabeceras** en `next.config.ts` y un test que las comprueba.
  - **Registro de errores sin datos personales:** revisar que `console.error` no escriba montos, nombres ni notas del usuario; registrar código, acción y mensaje.
  - **Previews desactivados:** paso a paso en la guía (Vercel → Settings → Git → Ignored Build Step) y sin variables de base de datos en Preview.
  - **Variables y entornos:** completar `.env.example` (incluye `NEXT_PUBLIC_APP_URL`), tabla de variables por entorno (Production / Preview / Development) y comprobación de que ninguna `[SECRET]` llega al cliente.
  - **Despliegue y base:** guía en `docs/SETUP.md` (o `docs/DEPLOY.md`): ramas de Neon, URL pooled, orden migrar → desplegar, cómo volver atrás (redeploy de la versión anterior; la migración aditiva no necesita deshacerse), copias de seguridad y ventana de restauración de Neon (revisar la de tu plan) y paso a la instancia de producción de Clerk con dominio propio.
  - **Dependencias:** revisar los 4 avisos moderados (aplicar solo correcciones sin cambios incompatibles; si no hay, documentar que afectan a una herramienta de desarrollo).
  - **CI** (`.github/workflows/ci.yml`): lint, test y build con Node igual al de Vercel; no necesita secretos (los tests usan PGlite).
  - **Prueba de humo posterior al despliegue** (lista manual, abajo).
- No incluye:
  - CSP, límite de peticiones, auditoría de accesos ni borrado/exportación de datos.
  - Cambios de funcionalidad, de datos o de diseño; instancia de producción de Clerk (requiere dominio).

## Archivos (previstos)

- `next.config.ts` y su test.
- `src/app/error.tsx`, `src/app/global-error.tsx`, `src/app/not-found.tsx`, `src/app/(app)/dashboard/{error,loading}.tsx`, `src/app/(app)/settings/loading.tsx`.
- `src/lib/actions-auth.test.ts` (test de protección).
- `src/lib/run-action.ts` (solo si el registro lleva datos personales).
- `.env.example`, `docs/SETUP.md` o `docs/DEPLOY.md`, `.github/workflows/ci.yml`, `docs/BRIEF.md` (estado).

## Criterios de aceptación

- AC1: añadir una server action sin `requireUserId()` hace fallar un test.
- AC2: toda ruta de la app tiene estado de error y de carga; una ruta inexistente muestra la página 404 de la app, no la de Next.
- AC3: las respuestas llevan las cabeceras de seguridad elegidas y el login de Clerk sigue funcionando.
- AC4: ningún mensaje de error visible ni registro contiene SQL, montos, nombres o notas del usuario.
- AC5: `.env.example` lista todas las variables y la guía dice qué va en cada entorno; ninguna variable secreta empieza con `NEXT_PUBLIC_`.
- AC6: la guía permite repetir el despliegue y una migración sin ayuda, y explica cómo volver atrás.
- AC7: una rama que no sea `main` no genera despliegue en Vercel, y el entorno Preview no tiene `DATABASE_URL`.
- AC8: CI pasa en verde en GitHub (si se aprueba la decisión 8).
- AC9: `npm run lint`, `npm run test` y `npm run build` pasan; los tests existentes no cambian de comportamiento.

## Tests requeridos

- Test de protección de las acciones (AC1) con casos de prueba propios del test: un archivo de ejemplo sin `requireUserId()` debe detectarse.
- Cabeceras: el resultado de `headers()` de `next.config.ts` contiene cada cabecera esperada para todas las rutas.
- Componentes de error: muestran el mensaje, no el error técnico, y "Reintentar" llama a `reset`.
- Sin cambios de base de datos: no hay migraciones nuevas.

## Prueba de humo en producción (manual, después de desplegar)

1. Crear cuenta nueva y entrar; cerrar sesión y volver a entrar.
2. Sin sesión, abrir `/dashboard`, `/accounts` y `/analysis`: deben llevar al login.
3. Crear cuenta, categoría y un gasto; ver que Inicio, saldo y presupuesto se actualizan.
4. Transferencia, pago de tarjeta y calibración de saldo.
5. Abrir una ruta inexistente y comprobar la página 404.
6. Ver los registros de Vercel: sin errores inesperados ni datos personales.
7. Con un segundo usuario, comprobar que no ve nada del primero.

## Orden de implementación

1. Test de protección y revisión de registros.
2. Páginas de error, carga y 404.
3. Cabeceras y su test.
4. Variables, guía de despliegue y revisión de dependencias.
5. CI.
6. Lint, tests, build; después del despliegue, la prueba de humo (la haces tú con sesión).

## Preguntas abiertas

1. ~~Neon separado~~ — decidido: una sola base.
2. ~~Previews de Vercel~~ — decidido: se desactivan.
3. **CI en GitHub Actions:** ¿lo añadimos? (Recomendado: sí.)
4. **Revisión:** esta spec toca seguridad; propongo usar el agente `reviewer` al terminar, solo con tu OK.

## Próximas fases

- 010a, 010c y 010b (P1), 011 (PWA).
- Cuando haya dominio propio: instancia de producción de Clerk, CSP y nuevo `NEXT_PUBLIC_APP_URL`.

## Notas de implementación

- `src/lib/actions-auth.test.ts` recorre los `*.actions.ts` (7 archivos, 28 acciones) y falla si una acción exportada no llama a `requireUserId()`.
- Registro seguro: `src/lib/safe-log.ts`. Drizzle mete los parámetros del `INSERT` en el mensaje del error y Postgres mete los valores en `detail`; `runAction` ya no escribe el error crudo, solo nombre, código y la primera línea del mensaje sin `params`.
- Páginas: `RouteError` compartido, `error.tsx` global, `global-error.tsx`, `not-found.tsx`, `error` y `loading` en Inicio y `loading` en Ajustes.
- Cabeceras en `next.config.ts` (`src/lib/security-headers.ts`), sin CSP.
- `NEXT_PUBLIC_APP_URL` vacío cuenta como no definido (`||`), para que copiar `.env.example` tal cual no rompa `new URL`.
- CI en `.github/workflows/ci.yml`; el build se verificó localmente sin `.env.local` y con valores de relleno.
- Dependencias: los 4 avisos moderados vienen de `minimatch` dentro de `ts-morph` (CLI de `shadcn`). `npm audit fix --force` propone bajar `shadcn` a 1.0.0 (paquete vacío): no se aplica. Documentado en `docs/DEPLOY.md`.
- Guía de despliegue en `docs/DEPLOY.md` (variables por entorno, previews desactivados, migraciones, vuelta atrás, Clerk, prueba de humo).
- Lo que **no** pude hacer desde aquí: configurar el Ignored Build Step ni las variables en Vercel, y la prueba de humo con sesión.
