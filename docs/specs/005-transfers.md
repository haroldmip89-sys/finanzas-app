# Transferencias entre cuentas

Estado: hecha

## Objetivo

El usuario mueve dinero entre sus propias cuentas (por ejemplo de BBVA a Yape) sin que cuente como ingreso ni gasto, y el **saldo de cada cuenta** refleja el movimiento. Reutiliza el patrón de las specs 003 y 004.

Referencias: `system-design.md §2` (`transfers` y la fórmula de saldo de la invariante 2), `§4` (el módulo depende de `accounts` y `db`), `D6` (tabla aparte, sin categoría).

## Alcance

- Incluye:
  - Tabla `transfers` con su migración y restricciones (primera migración después de la inicial).
  - Módulo `src/modules/transfers`: schemas, servicio, server actions, hooks y componentes.
  - Página `/transfers` con filtros, listado paginado y formulario en diálogo.
  - Saldo de cuenta ampliado: + transferencias recibidas − enviadas (cambia `accounts.service`).
  - Entrada "Transferencias" en la navegación.
- No incluye:
  - Comisiones, tipo de cambio o transferencias entre monedas (solo PEN).
  - Impedir transferir más del saldo disponible: se permite (una tarjeta o una cuenta puede quedar en negativo).
  - Transferencias a cuentas de otras personas o programadas.
  - Dashboard (spec 007) y presupuestos (006).

## Reglas de negocio

- Campos: `fromAccountId`, `toAccountId`, `amount` (PEN con hasta 2 decimales, mayor que 0), `date` (día calendario, mismo formato y rango que las transacciones), `note` (opcional, hasta 280 caracteres, recortada).
- El origen y el destino deben ser **del usuario** y **distintos**. No pueden estar archivados al crear; al editar solo se exige "no archivada" si cambian (una transferencia puede conservar una cuenta que se archivó después).
- Editar y eliminar son libres (eliminación física con confirmación).
- Una cuenta con transferencias no se puede eliminar, solo archivar; el mensaje de `IN_USE` de cuentas pasa a decir "tiene transacciones o transferencias".
- Saldo actual de una cuenta = `initial_balance_cents` + Σ ingresos − Σ gastos + Σ transferencias recibidas − Σ transferencias enviadas.
- Las transferencias no entran en los totales de ingresos, gastos ni presupuestos.

## Diseño

Esquema (migración nueva generada con `npm run db:generate`; nunca se edita la migración inicial):

- `transfers`: `id`, `user_id`, `from_account_id`, `to_account_id`, `amount_cents bigint`, `date date`, `note text null`, `created_at`, `updated_at`, como en `system-design.md §2`.
- Restricciones: `CHECK (amount_cents > 0)`, `CHECK (from_account_id <> to_account_id)`, `CHECK (note IS NULL OR char_length(note) <= 280)`; claves foráneas compuestas (`from_account_id`, `user_id`) y (`to_account_id`, `user_id`) hacia `accounts(id, user_id)` con `ON DELETE RESTRICT`.
- Índices: (`user_id`, `date` desc), (`user_id`, `from_account_id`), (`user_id`, `to_account_id`).

Capas (como en la 003): server action (auth + Zod) → servicio con fábrica `createTransfersService(db)` (reglas de negocio, filtra siempre por `userId`, lanza `AppError`) → restricciones de la base como última defensa. Errores de referencias como errores de campo (`fromAccountId`, `toAccountId`), sin revelar si un id existe.

Listado (`list`): filtros `from`, `to`, `accountId` (coincide con origen **o** destino), `page` (desde 1) y `pageSize` (20 por defecto, máximo 100). Orden por `date` descendente y luego `created_at` descendente. Devuelve `{ items, total, page, pageSize }`; cada item incluye los nombres de ambas cuentas (unión en SQL, sin N+1). Una página fuera de rango devuelve `items` vacío.

Saldo (`accounts.service.list`): se suman y restan las transferencias en la misma consulta SQL agregada, con columnas calificadas a mano (lección de la spec 004: dentro de una subconsulta Drizzle omite el prefijo de tabla).

UI (responsive, dark, tokens):

- Filtros: rango de fechas (mes actual en Lima por defecto) y cuenta, con "Limpiar". Se reutiliza el patrón de `TransactionFilters`.
- Listado con `ResourceCard`: icono de flechas, título "Origen → Destino", subtítulo con fecha y nota, monto sin signo ni color. Menú de acciones (editar, eliminar) con destinos de 44 px en táctil. Paginación con `PaginationNav`.
- Formulario en diálogo: origen, destino (sin la cuenta elegida como origen; si el origen pasa a ser el destino, se limpia el destino), monto con `MoneyInput`, fecha (hoy en Lima por defecto) y nota. Con menos de 2 cuentas activas se muestra un estado vacío con enlace a `/accounts`.
- Estados de carga, vacío (con y sin filtros) y error con "Reintentar"; `loading.tsx` y `error.tsx`.
- Navegación: con 6 destinos en total, la barra inferior usa una etiqueta más corta y con `truncate` y debe verse bien a 360 px.

## Reutilizar

- Infraestructura de las specs 003 y 004: `AppError`, `ActionResult`, `runAction`, `unwrapResult`, `errorMessage`, `money.ts`, `dates.ts`, `useZodForm`, `QueryProvider`, `MoneyInput`.
- Componentes compartidos: `PageHeader`, `EmptyState`, `ErrorMessage`, `ConfirmDialog`, `FormField`, `ResourceCard`, `PaginationNav`.
- Patrón de `src/modules/transactions` (servicio, hooks de filtros, formulario y gestor) y `useAccounts(false)` / `useAccounts(true)`.
- `src/db/test-db.ts` (PGlite con migraciones reales: aplicará la migración nueva automáticamente).

## Archivos

Esquema y migración:

- `src/db/schema/transfers.table.ts`, `src/db/schema/index.ts` (export)
- `drizzle/0001_*.sql` y `drizzle/meta/*` (generados)
- `src/db/schema/constraints.test.ts` y `src/db/migrations.test.ts` (ampliados)

Módulo `transfers` (`src/modules/transfers/`):

- `schemas/transfer.schema.ts` (+ test), `types/transfer.types.ts`
- `services/transfers.service.ts` (+ test con PGlite)
- `actions/transfers.actions.ts`
- `hooks/use-transfers.ts`, `use-transfer-mutations.ts`, `use-transfer-filters.ts`, `use-transfer-form.ts`, `use-transfers-manager.ts` (+ tests de los hooks con lógica)
- `components/transfers-page.tsx`, `transfer-filters.tsx`, `transfer-row.tsx`, `transfer-form-dialog.tsx`

Rutas:

- `src/app/(app)/transfers/page.tsx`, `loading.tsx`, `error.tsx`

Modificados:

- `src/modules/accounts/services/accounts.service.ts` (+ test): saldo con transferencias y mensaje de `IN_USE`.
- `src/modules/accounts/hooks/use-account-mutations.ts` no cambia; las mutaciones de transferencias invalidan `["accounts"]`.
- `src/modules/shell/nav-items.ts` y `components/nav-link.tsx` / `bottom-nav.tsx` (etiqueta corta y `truncate`).
- `docs/architecture/system-design.md` (fecha de la migración y nota del saldo).

## Criterios de aceptación

- AC1: se pueden crear, editar y eliminar transferencias desde `/transfers`, y la lista y los saldos de `/accounts` se actualizan sin recargar.
- AC2: una transferencia de A a B resta el monto del saldo de A y lo suma al de B; los totales de ingresos, gastos y balance de `/transactions` no cambian.
- AC3: la base rechaza monto ≤ 0, nota de más de 280 caracteres, origen igual al destino y cuentas de otro usuario; el servicio devuelve errores de campo claros para esos casos y para cuentas archivadas o inexistentes.
- AC4: un usuario nunca ve ni modifica transferencias de otro (`NOT_FOUND`), y el saldo de sus cuentas nunca incluye transferencias ajenas.
- AC5: una cuenta con transferencias no se puede eliminar (`IN_USE`, mensaje de archivarla) y sí se puede archivar.
- AC6: los filtros de fechas y cuenta (origen o destino) combinan entre sí; por defecto se ve el mes actual en Lima; el listado está ordenado, paginado de 20 en 20 y una página fuera de rango no rompe.
- AC7: editar una transferencia puede conservar una cuenta archivada después; cambiar a una archivada se rechaza.
- AC8: el monto se captura con `MoneyInput` en PEN y se guarda en céntimos; entradas inválidas (`0`, negativos, `abc`, vacío) se rechazan con error de campo.
- AC9: todo error llega como `ActionResult` con mensaje seguro; la lógica está en hooks; no se pasan funciones ni componentes de servidor a cliente.
- AC10: `/transfers` es responsive (360, 768, 1280 px, sin scroll horizontal), funciona en claro y oscuro, usa solo tokens y tiene estados de carga, vacío (con y sin filtros) y error; la barra inferior con 6 destinos se ve bien a 360 px.
- AC11: `npm run lint`, `npm run test` y `npm run build` pasan; la migración se aplica desde cero en PGlite.
- AC12 (manual, con sesión): el flujo completo funciona en el navegador contra Neon, previa `npm run db:migrate`.

## Tests requeridos

(Vitest; servicio y restricciones con PGlite y las migraciones reales)

- `constraints.test.ts` (ampliado): un caso por cada rechazo de AC3 y por `ON DELETE RESTRICT` sobre cuentas con transferencias, más el flujo feliz.
- `migrations.test.ts` (ampliado): existe la tabla `transfers`.
- `transfer.schema.test.ts`: casos válidos e inválidos; origen igual al destino; filtros con `from > to` y `pageSize` fuera de rango.
- `transfers.service.test.ts`: CRUD; origen o destino ajenos, archivados, inexistentes o iguales (errores de campo); aislamiento entre usuarios; filtros combinados (incluida la cuenta como origen o destino); orden y paginación; editar conservando una cuenta archivada.
- `accounts.service.test.ts` (ampliado): saldo con transferencias enviadas y recibidas, combinado con ingresos y gastos; sin efecto de transferencias ajenas; `IN_USE` al eliminar una cuenta con transferencias.
- `use-transfer-filters.test.ts`, `use-transfer-form.test.tsx`, `use-transfers-manager.test.tsx`: período por defecto, reinicio de página, monto en céntimos, destino que se limpia al coincidir con el origen, mapeo de errores de campo, eliminar con confirmación y error visible.
- Componentes presentacionales: sin test unitario; se verifican en el navegador.

## Orden de implementación

1. Tabla, migración y tests de restricciones; schemas y servicio con sus tests; saldo ampliado en `accounts.service`.
2. Acciones, hooks y sus tests.
3. Componentes, página, `loading` / `error` y navegación.
4. Lint, tests, build, prueba en vivo en Neon (tras aplicar la migración con tu confirmación) y verificación en el navegador.

## Preguntas abiertas

1. **Dónde vive en la interfaz.** Se propone una página propia `/transfers` con entrada en la navegación (6 destinos). Alternativa: pestañas "Movimientos | Transferencias" dentro de `/transactions`, que deja la navegación en 5 destinos.
2. **Sobregiro.** Se permite transferir más de lo que tiene la cuenta de origen. ¿Prefieres bloquearlo, al menos para cuentas que no sean tarjeta?
3. **Migración en Neon.** `npm run db:migrate` modifica tu base: se ejecuta solo con tu confirmación.
4. **Revisión.** Spec con dinero y migración: se propone pasar el `reviewer` al terminar, con tu OK.

## Próximas fases

- 006: presupuestos. 007: dashboard. 008: endurecimiento y deploy.
