# Cuentas y categorías

Estado: hecha

## Objetivo

Primer módulo de dominio completo: el usuario administra sus **cuentas** y **categorías** (crear, editar, archivar, eliminar si no tienen uso) desde dos páginas responsive. Sirve además de **plantilla** del patrón del proyecto para los módulos siguientes: servicios validados, resultados tipados sin excepciones hacia el cliente, lógica en hooks y componentes reutilizables (`docs/SETUP.md §2`, "Convenciones adicionales").

Referencias: `system-design.md §2` (entidades e invariantes), `§4` (módulos), `§5` (acceso a datos), `§7` (PEN).

## Alcance

- Incluye:
  - Infraestructura transversal: `AppError`, `ActionResult` y `runAction` (errores controlados), helper de dinero PEN, `QueryClientProvider`, hook de formularios con Zod.
  - Módulos `src/modules/accounts` y `src/modules/categories`: schemas Zod, servicios, server actions, hooks y componentes.
  - Sembrado idempotente de categorías por defecto.
  - Páginas `/accounts` y `/categories` y sus entradas en la navegación.
  - Componentes compartidos nuevos: `PageHeader`, `EmptyState`, `ConfirmDialog`, `FormField`, `ErrorMessage`, `ResourceCard`.
- No incluye:
  - Transacciones, saldo calculado de la cuenta (necesita transacciones; se muestra solo el saldo inicial, spec 004) y presupuestos.
  - Selector de color de categorías (la columna `color` existe pero no se usa: YAGNI).
  - Reordenar, iconos personalizados fuera de un conjunto fijo, importación.
  - Toasts o notificaciones: el feedback es el cierre del diálogo y la lista actualizada; los errores se muestran en línea.

## Reglas de negocio

Cuentas:

- `name`: texto recortado, 1 a 50 caracteres, único por usuario sin distinguir mayúsculas.
- `type`: `cash`, `bank`, `card` o `wallet`.
- `initial_balance_cents`: entero (puede ser negativo); se captura en PEN con hasta 2 decimales.
- Archivar y desarchivar siempre se permite. Eliminar solo si no tiene transacciones; si las tiene, error `IN_USE` que sugiere archivar.

Categorías:

- `name`: texto recortado, 1 a 40 caracteres, único por (`kind`, nombre) por usuario sin distinguir mayúsculas.
- `kind` (`income` / `expense`) se fija al crear y **no se puede cambiar** (las transacciones dependen de él).
- `icon`: uno de un conjunto fijo de iconos `lucide-react` (clave de texto).
- Archivar, desarchivar y eliminar siguen las mismas reglas que las cuentas.

Categorías por defecto (se siembran solo si el usuario no tiene **ninguna** categoría; las archivadas cuentan, así que archivar todas no re-siembra, pero eliminar físicamente todas sí lo hace: no se guarda un marcador aparte, por simplicidad; es idempotente y tolera concurrencia con `ON CONFLICT DO NOTHING`):

- Gasto: Alimentación, Transporte, Vivienda, Servicios, Salud, Educación, Entretenimiento, Compras, Otros gastos.
- Ingreso: Sueldo, Negocio, Otros ingresos.

## Diseño

Capas y responsabilidades (validación en tres capas, sin confiar en ninguna):

1. **Server action** (`*.actions.ts`): obtiene `userId` con `requireUserId()`, valida el input con Zod y llama al servicio dentro de `runAction`.
2. **Servicio** (`*.service.ts`): recibe `userId` y datos ya tipados, **revalida las reglas de negocio** (pertenencia al usuario, duplicados sin distinguir mayúsculas, tipo inmutable, borrado con uso) y lanza `AppError`. Se construye con una fábrica que recibe la base (`createAccountsService(db)`) para poder probarlo con PGlite; la instancia real usa `src/db/client.ts`. Toda consulta filtra por `userId`.
3. **Base de datos**: restricciones de la spec 002 como última defensa; los errores de Postgres (`23505` unicidad, `23503` y `23001` de clave foránea y `ON DELETE RESTRICT`) se traducen a `CONFLICT` e `IN_USE`.

Errores controlados:

- `src/lib/errors.ts`: `AppError` (`code`, `message` seguro para el usuario, `fieldErrors?`) y códigos `VALIDATION`, `CONFLICT`, `NOT_FOUND`, `IN_USE`, `UNAUTHORIZED`, `INTERNAL`.
- `src/lib/action-result.ts`: tipo `ActionResult<T> = { ok: true; data: T } | { ok: false; error: { code; message; fieldErrors? } }` y `runAction(fn)`, que convierte `AppError`, `ZodError` y errores de Postgres en `ActionResult`, registra en el servidor lo inesperado devolviendo `INTERNAL` con un mensaje genérico (nunca texto crudo de Postgres, Neon o Clerk) y **vuelve a lanzar** las excepciones de control de Next.js (redirect, notFound, de `auth.protect()`) con `unstable_rethrow`.
- Cada página tiene `loading.tsx` y `error.tsx` con botón "Reintentar".

Lógica en hooks, componentes que solo renderizan:

- Datos: TanStack Query. `useAccounts()` / `useCategories()` consultan mediante server actions; las mutaciones (`useCreateAccount`, `useUpdateAccount`, `useArchiveAccount`, `useDeleteAccount` y equivalentes de categorías) invalidan la lista y exponen `error` e `isPending`. Un `ActionResult` con `ok: false` se convierte en error del hook.
- Formularios: hook genérico `useZodForm` (sobre `react-hook-form` + resolver de Zod) que mapea `fieldErrors` del servidor a los campos. `useAccountForm` y `useCategoryForm` componen validación, envío y cierre.
- Estado de UI (diálogo abierto, elemento a editar o eliminar): en `useAccountsManager` / `useCategoriesManager`.
- Dinero: `src/lib/money.ts` con `penToCents("12.50") -> 1250` (sobre dígitos, sin `parseFloat`; `null` si no es válido), `centsToPen(1250) -> "12.50"` y `formatPen(1250) -> "S/ 12.50"` (`Intl.NumberFormat("es-PE", { currency: "PEN" })`). Se adelanta desde la spec 004, que lo reutiliza.

UI (responsive y dark, solo tokens):

- Listado en tarjetas (`ResourceCard`): una columna en móvil, dos desde `md`, tres desde `xl`. Acciones (editar, archivar, eliminar) en un menú por tarjeta con destinos táctiles de al menos 44 px. Archivados al final y atenuados, con interruptor "Mostrar archivados".
- Crear/editar en un diálogo con formulario (`FormField`), con el foco en el primer campo y errores por campo y generales en línea (`ErrorMessage`).
- Estados de carga (esqueleto), vacío (`EmptyState` con acción "Crear ...") y error (`ErrorMessage` con reintentar).
- Categorías: pestañas o filtro Gasto / Ingreso.
- Navegación: entradas "Cuentas" (`/accounts`) y "Categorías" (`/categories`) en `src/modules/shell/nav-items.ts`.

## Reutilizar

- `src/lib/auth.ts` (`requireUserId()`), `src/db/client.ts`, `src/db/schema/*`, `src/db/test-db.ts` (tests con PGlite).
- `src/components/ui/button.tsx`, `dropdown-menu.tsx`; shadcn a agregar con la CLI: `dialog`, `input`, `label`, `select`, `badge`, `skeleton`, `tabs`, `switch`, `alert`.
- `src/modules/shell/nav-items.ts`, `src/lib/utils.ts` (`cn`).
- Patrón de referencia en `../nexora-app`: `confirm-dialog.tsx`, `empty-state.tsx`, `form-field.tsx` (se adaptan; no existen aquí).

## Archivos

Infraestructura:

- `src/lib/errors.ts`, `src/lib/errors.test.ts`
- `src/lib/action-result.ts`, `src/lib/action-result.test.ts`
- `src/lib/money.ts`, `src/lib/money.test.ts`
- `src/hooks/use-zod-form.ts`, `src/hooks/use-zod-form.test.ts`
- `src/components/shared/query-provider.tsx`
- `src/components/shared/page-header.tsx`, `empty-state.tsx`, `confirm-dialog.tsx`, `form-field.tsx`, `error-message.tsx`, `resource-card.tsx`
- `src/components/ui/*` generados por shadcn (ver Reutilizar)

Módulo `accounts` (`src/modules/accounts/`):

- `schemas/account.schema.ts` (+ test), `types/account.types.ts`
- `services/accounts.service.ts` (+ test con PGlite)
- `actions/accounts.actions.ts`
- `hooks/use-accounts.ts`, `use-account-mutations.ts`, `use-account-form.ts`, `use-accounts-manager.ts` (+ tests de los hooks con lógica)
- `components/accounts-page.tsx`, `account-card.tsx`, `account-form-dialog.tsx`

Módulo `categories` (`src/modules/categories/`):

- `schemas/category.schema.ts` (+ test), `types/category.types.ts`
- `constants/default-categories.ts`, `constants/category-icons.ts`
- `services/categories.service.ts` (+ test con PGlite, incluye el sembrado)
- `actions/categories.actions.ts`
- `hooks/use-categories.ts`, `use-category-mutations.ts`, `use-category-form.ts`, `use-categories-manager.ts` (+ tests)
- `components/categories-page.tsx`, `category-card.tsx`, `category-form-dialog.tsx`

Rutas:

- `src/app/(app)/accounts/page.tsx`, `loading.tsx`, `error.tsx`
- `src/app/(app)/categories/page.tsx`, `loading.tsx`, `error.tsx`

Modificados:

- `package.json`, `package-lock.json` (`react-hook-form`, `@hookform/resolvers`)
- `src/app/(app)/layout.tsx` (monta `QueryProvider`)
- `src/modules/shell/nav-items.ts`

## Criterios de aceptación

- AC1: se pueden crear, editar, archivar, desarchivar y eliminar cuentas y categorías desde `/accounts` y `/categories`, y la lista se actualiza sin recargar.
- AC2: el nombre duplicado (sin distinguir mayúsculas) se rechaza con un error de campo claro, tanto en cuentas como en categorías.
- AC3: la `kind` de una categoría no se puede cambiar al editar.
- AC4: eliminar una cuenta o categoría con transacciones devuelve `IN_USE` con el mensaje de archivarla; sin uso, se elimina.
- AC5: un usuario nunca ve ni modifica datos de otro: leer, editar, archivar o eliminar un `id` ajeno devuelve `NOT_FOUND`.
- AC6: al primer acceso se siembran las categorías por defecto; repetir el acceso, o dos accesos simultáneos, no crea duplicados; si el usuario archiva todas, no se vuelven a sembrar (eliminar todas sí las re-siembra; ver Reglas de negocio).
- AC7: ninguna server action lanza hacia el cliente un error crudo: todo error llega como `ActionResult` con mensaje seguro; los errores inesperados devuelven `INTERNAL` genérico y se registran en el servidor; las excepciones de control de Next.js se propagan.
- AC8: los componentes no contienen `useState`, `useEffect` ni llamadas a acciones; toda esa lógica está en hooks (los componentes de UI genéricos con estado propio de presentación, como el diálogo, quedan exentos).
- AC9: el saldo inicial se captura y muestra en PEN (`S/ 12.50`) y se guarda en céntimos enteros; entradas inválidas (`abc`, `1.234`, vacío) se rechazan.
- AC10: `/accounts` y `/categories` son responsive (360, 768, 1280 px, sin scroll horizontal), funcionan en claro y oscuro, usan solo tokens y tienen estados de carga, vacío y error.
- AC11: la navegación muestra "Cuentas" y "Categorías", con el enlace activo resaltado.
- AC12: `npm run lint`, `npm run test` y `npm run build` pasan.
- AC13 (manual): con `DATABASE_URL` real y la migración aplicada, el flujo completo funciona en el navegador.

## Tests requeridos

(Vitest; los servicios con PGlite y las migraciones reales)

- `errors.test.ts` y `action-result.test.ts`: `runAction` convierte `AppError`, `ZodError` y errores `23505`/`23503` en el `ActionResult` correcto, oculta mensajes crudos y relanza redirect/notFound.
- `money.test.ts`: `penToCents`, `centsToPen` y `formatPen` con enteros, 1 y 2 decimales, ceros, negativos y entradas inválidas.
- `account.schema.test.ts` y `category.schema.test.ts`: casos válidos e inválidos (vacío, largo, tipo, kind).
- `accounts.service.test.ts` y `categories.service.test.ts`: CRUD; aislamiento entre dos usuarios (AC5); duplicados sin distinguir mayúsculas; `kind` inmutable; eliminar con transacciones (`IN_USE`) y sin ellas; sembrado idempotente, concurrente y que no reaparece tras archivar todas (AC6).
- `use-zod-form.test.ts`, hooks de mutación y de gestor: exponen `error` cuando la acción devuelve `ok: false`, invalidan la lista en éxito y mapean `fieldErrors`.
- Componentes presentacionales: sin test unitario; se verifican en el navegador.

## Orden de implementación

1. Dependencias y componentes shadcn; `errors`, `action-result`, `money`, `use-zod-form`; componentes compartidos; `QueryProvider`.
2. Categorías (incluye sembrado) como primer módulo; ajustar la infraestructura con lo aprendido.
3. Cuentas, replicando el patrón.
4. Páginas, navegación, `loading` / `error`, y verificación en el navegador.

## Preguntas abiertas

1. **Rama de Neon.** La UI necesita la base y la migración aplicada (AC13). Ver instrucciones en la respuesta; hasta tener `DATABASE_URL` en `.env.local` verifico con los tests y con la interfaz hasta donde no requiera datos.
2. **`react-hook-form`.** Se propone como dependencia para los formularios. Alternativa sin dependencia: un `useZodForm` propio más simple. Se mantiene `react-hook-form` salvo que prefieras evitarlo.
3. **Categorías por defecto.** ¿La lista propuesta te sirve o ajustas nombres (por ejemplo "Mascotas", "Ahorro")?
4. **Revisión.** Es una spec de datos y de reglas de negocio: se propone pasar el `reviewer` al terminar, con tu OK.

## Próximas fases

- 004: transacciones (CRUD, filtros, paginación, saldo calculado por cuenta).
- 005: presupuestos mensuales. 006: dashboard.
