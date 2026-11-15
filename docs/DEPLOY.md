# Despliegue (Vercel + Neon + Clerk)

Guía para publicar Yupi!. Nada de esto se ha ejecutado desde el repo: aplicar migraciones y desplegar lo hace una persona.

## 1. Variables de entorno

Se guardan en el panel de Vercel (Settings → Environment Variables), nunca en archivos. Los nombres están en `.env.example`.

| Variable | Secreta | Notas |
|---|---|---|
| `DATABASE_URL` | Sí | Cadena de conexión de Neon (usa la de producción, con `sslmode=require`). |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | No | Instancia de **producción** de Clerk (`pk_live_...`). |
| `CLERK_SECRET_KEY` | Sí | `sk_live_...`. |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | No | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | No | `/sign-up` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL` | No | `/` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | No | `/` |
| `NEXT_PUBLIC_APP_URL` | No | URL pública final (por ejemplo `https://tu-dominio.com`). Si falta, se usa la de `src/lib/site.ts`. |

## 2. Migraciones pendientes

Las migraciones de `drizzle/` se aplican con `npm run db:migrate` (con `DATABASE_URL` apuntando a la base destino). Antes de usar la app contra una base ya existente, aplica las que falten:

| Migración | Contenido |
|---|---|
| `0003_wild_adam_warlock` | Columna `include_in_available` en `accounts` (dinero disponible, spec 009a). |
| `0004_high_puppet_master` | Tabla `avoided_purchases` (compras evitadas, spec 010a). |
| `0005_thick_mephisto` | Tabla `user_settings` (compra consciente, spec 010c). |

Sin la 0003 falla el listado de cuentas; sin la 0004 fallan Compras evitadas y el resumen semanal; sin la 0005 el paso de compra consciente simplemente no aparece. Las tres son aditivas (no borran datos). **Haz una copia o una rama de Neon antes de migrar la base con tus datos reales.**

## 3. Clerk de producción

1. Crea la instancia de producción en Clerk y configura el dominio.
2. Copia las claves `pk_live_` y `sk_live_` a Vercel.
3. Revisa los orígenes y las URL de redirección permitidas.

## 4. Vercel

- Framework: Next.js; comando de build `npm run build`; Node 20.9 o superior.
- Región cercana a la base de Neon.
- Dominio propio y HTTPS (Vercel lo gestiona; la app ya envía `Strict-Transport-Security`).

## 5. Antes de publicar

- [ ] `npm run lint`, `npm run test` y `npm run build` pasan.
- [ ] Migraciones 0003 a 0005 aplicadas en la base destino (con copia previa).
- [ ] Variables de producción cargadas en Vercel.
- [ ] Instancia de Clerk de producción configurada.

## 6. Después de publicar

- [ ] Inicia sesión y comprueba Inicio, Movimientos, Cuentas y Análisis.
- [ ] Registra un gasto de prueba mayor al umbral de compra consciente y verifica el paso previo; elimínalo después.
- [ ] Abre una ruta inexistente y comprueba la página "No encontramos esta página".
- [ ] Comprueba las cabeceras: `curl -sI https://tu-dominio.com | grep -i -E "x-frame|nosniff|strict-transport|referrer|permissions"`.

## 7. Siguientes pasos de seguridad (no hechos)

- **Content-Security-Policy:** requiere probar Clerk (scripts y frames) en un navegador real antes de activarla.
- **Límite de peticiones (rate limiting)** en las acciones de escritura, por ejemplo con Vercel Firewall o Upstash.
- **Copias de seguridad:** activar la retención de Neon (restauración a un punto en el tiempo).
