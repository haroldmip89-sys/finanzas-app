# Despliegue y operación (Vercel + Neon + Clerk)

Guía de la spec 010. Producción: `https://yupi-app-eight.vercel.app`. Clerk usa la instancia **de desarrollo** (sin dominio propio).

## 1. Entornos y variables

Las variables se guardan en Vercel (Settings → Environment Variables), nunca en archivos. Las marcadas **[SECRET]** no deben empezar con `NEXT_PUBLIC_` ni llegar al cliente.

| Variable | Producción | Preview | Local (`.env.local`) |
|---|---|---|---|
| `DATABASE_URL` **[SECRET]** | URL **pooled** de Neon (host con `-pooler`) | **No definir** (los previews están desactivados) | La misma base (una sola base de datos) |
| `CLERK_SECRET_KEY` **[SECRET]** | `sk_test_…` (instancia de desarrollo) | No definir | `sk_test_…` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_…` | No definir | `pk_test_…` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` | — | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` | — | `/sign-up` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | `/` | — | `/` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL` | `/` | — | `/` |
| `NEXT_PUBLIC_APP_URL` (opcional) | Solo si cambia el dominio | — | No definir |

Notas:

- No hay webhook de Clerk: la app no guarda usuarios, todo se filtra por el `userId` de Clerk.
- Después de cambiar una variable en Vercel hay que **redesplegar** para que se aplique.

## 2. Previews desactivados

Solo `main` se despliega. En Vercel el ajuste **Ignored Build Step** no está en la pestaña Git: está en **Settings → Build and Deployment** (menú de la izquierda), más abajo en esa misma página. Opciones:

- Si ves la opción **"Only build production"**, elígela y listo: es justo lo que necesitamos.
- Si no, elige **"Run my Bash script"** y pega:

```bash
if [ "$VERCEL_GIT_COMMIT_REF" = "main" ]; then exit 1; else exit 0; fi
```

(En Vercel, el código `1` significa "construir" y el `0` "omitir".) El entorno Preview queda sin `DATABASE_URL`, de modo que un preview accidental falle en vez de tocar la base real. Para comprobarlo, sube una rama de prueba y verifica que no aparece un despliegue nuevo.

Si algún día se usan ramas o pull requests: crear una rama de Neon para Preview y poner su `DATABASE_URL` solo en el entorno Preview.

## 3. Base de datos (Neon)

- Usar la URL **pooled** (host con `-pooler`) en Vercel: reduce el costo de conexión en arranques en frío de las funciones. El código no modifica la URL.
- Una sola base de datos para local y producción: las pruebas con datos se hacen con usuarios temporales que se borran al terminar.
- **Copias de seguridad:** Neon permite restaurar la base a un punto anterior dentro de la ventana de historial de tu plan. Revisa cuánto dura la tuya en el panel de Neon antes de depender de ella.

## 4. Migraciones

Migrar y desplegar no son atómicos, por eso toda migración debe ser **aditiva y compatible hacia atrás**: columnas nuevas con valor por defecto, tablas nuevas. Nada de renombrar ni borrar columnas en el mismo paso que el código que las deja de usar.

Orden:

1. Generar: `npm run db:generate` y revisar el `.sql` de `drizzle/`.
2. Probar con `npm run test` (los tests aplican las migraciones reales sobre PGlite).
3. Aplicar a la base: `npm run db:migrate`.
4. Hacer commit y push a `main` (Vercel despliega).

Si hace falta quitar o renombrar algo, se hace en dos despliegues: primero el código que ya no lo usa, después la migración que lo elimina.

## 5. Volver atrás

- **Código:** en Vercel → Deployments, abrir el despliegue anterior que funcionaba → "Promote to Production" (o "Redeploy"). No hace falta tocar la base: las migraciones aditivas no rompen la versión anterior.
- **Datos:** restaurar desde el historial de Neon (sección 3), siempre con cuidado: pierde lo escrito después del punto elegido.

## 6. Clerk

- La instancia de **desarrollo** muestra el aviso "Development mode" en el login. No tiene costo; es la limitación de no tener dominio propio.
- Pasar a la instancia de **producción** exige un dominio propio y registros DNS. Pasos: crear la instancia de producción en Clerk, configurar el dominio y el DNS, poner las claves `pk_live_…` / `sk_live_…` en Vercel (Production), definir `NEXT_PUBLIC_APP_URL` y redesplegar.
- **Atención:** cada instancia de Clerk tiene sus propios usuarios, con otros `userId`. Los datos de Neon se filtran por ese id, así que al cambiar de instancia los datos existentes **no se ven** hasta actualizar el `user_id` de cada tabla. Hay que planificar esa migración de datos antes de cambiar.
- Si borras un usuario en Clerk, sus datos siguen en Neon (no hay webhook que los borre).

## 7. CI

`.github/workflows/ci.yml` corre lint, tests y build en cada push a `main` y en cada pull request. No necesita secretos (los tests usan PGlite y el build recibe valores de relleno). Un CI en rojo no impide el despliegue de Vercel: es un aviso para corregir.

## 8. Prueba de humo en producción (manual)

1. Crear una cuenta nueva y entrar; cerrar sesión y volver a entrar.
2. Sin sesión, abrir `/dashboard`, `/accounts` y `/analysis`: deben llevar al login.
3. Crear una cuenta, una categoría y un gasto: Inicio, saldo y presupuesto se actualizan.
4. Hacer una transferencia, un pago de tarjeta y una calibración de saldo.
5. Abrir una ruta inexistente: debe verse la página "Esta página no existe".
6. Revisar los registros de Vercel: sin errores inesperados ni datos personales.
7. Con un segundo usuario, comprobar que no ve nada del primero.

## 9. Dependencias

`npm audit` avisa de 4 problemas moderados (`minimatch` dentro de `ts-morph`, que viene con la herramienta `shadcn`). Afectan solo a la CLI de desarrollo, no al código que se ejecuta en producción. **No** usar `npm audit fix --force`: propone bajar `shadcn` a la versión 1.0.0, que está vacía y rompería el build. Se revisará cuando `shadcn` actualice sus dependencias.

## 10. Pendiente

- CSP (Content-Security-Policy): requiere la política específica de Clerk; se hará con dominio propio.
- Exportación o borrado de datos de un usuario.
- Retención de datos antiguos: no se borra nada automáticamente.
