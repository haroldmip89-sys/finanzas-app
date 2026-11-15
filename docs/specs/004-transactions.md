# Transacciones

Estado: hecha

## Objetivo

El usuario registra sus **ingresos y gastos** (crear, editar, eliminar), los consulta con filtros y paginación, y ve el **saldo actual de cada cuenta**. Es el módulo central de la app y reutiliza el patrón de la spec 003 (servicios validados, `ActionResult`, lógica en hooks, componentes compartidos).

Referencias: `system-design.md §2` (`transactions`, invariantes 1 a 3), `§4` (el módulo depende de `accounts`, `categories` y `db`), `§7` (PEN, fechas en `America/Lima`).

## Alcance

- Incluye:
  - Módulo `src/modules/transactions`: schemas, servicio, server actions, hooks y componentes.
  - Página `/transactions` con resumen del período, filtros, listado paginado y formulario en diálogo.
  - Helper de fechas `src/lib/dates.ts` (hoy en Lima, formato de fecha, validación).
  - Saldo actual por cuenta en `/accounts` (inicial + ingresos − gastos), calculado en SQL.
  - Componente compartido `PaginationNav`; entrada "Transacciones" en la navegación.
- No incluye:
  - Transferencias entre cuentas y su efecto en el saldo (spec 005, que amplía la fórmula).
  - Presupuestos (006) y dashboard (007).
  - Búsqueda de texto, exportación, adjuntos, transacciones recurrentes, etiquetas.
  - Sincronizar filtros con la URL (YAGNI; el estado de filtros vive en un hook).

## Reglas de negocio

- Campos: `type` (`income` / `expense`), `amount` (PEN con hasta 2 decimales, mayor que 0), `date` (día calendario, `YYYY-MM-DD`), `accountId`, `categoryId`, `note` (opcional, hasta 280 caracteres, recortada).
- La cuenta y la categoría deben ser **del usuario** y no estar archivadas al crear. Al editar solo se vuelve a exigir "no archivada" si cambian; una transacción puede conservar una cuenta o categoría que se archivó después.
- El `type` debe coincidir con el `kind` de la categoría. La base lo impone con la clave compuesta; el servicio lo valida antes y devuelve un error de campo claro.
- La fecha debe ser válida y no anterior a `2000-01-01`. Se permiten fechas futuras.
- Eliminar una transacción es físico (con confirmación): no tiene historial dependiente.
- Saldo actual de una cuenta = `initial_balance_cents` + Σ ingresos − Σ gastos de esa cuenta (sin filtrar por fecha). La spec 005 le suma las transferencias.

## Diseño

Capas (como en la spec 003): server action (auth + Zod) → servicio con fábrica `createTransactionsService(db)` (reglas de negocio, filtra siempre por `userId`, lanza `AppError`) → restricciones de la base como última defensa (`23505`, `23001`, `23503` ya traducidos por `runAction`).

Listado (`list`):

- Filtros: `from`, `to` (inclusivos, `from <= to`), `type`, `accountId`, `categoryId`, `page` (desde 1) y `pageSize` (20 por defecto, máximo 100).
- Orden: `date` descendente y, a igualdad, `created_at` descendente.
- Devuelve `{ items, total, page, pageSize, totals }`. Cada item incluye el nombre de la cuenta y el nombre e icono de la categoría (unión en SQL, sin consultas N+1). `totals` = `{ incomeCents, expenseCents }` del conjunto filtrado completo, no solo de la página.
- Una página fuera de rango devuelve `items` vacío y `total` correcto.

Saldo por cuenta: `accountsService.list` incorpora `balanceCents` calculado con una consulta agregada sobre `transactions` (una sola consulta para todas las cuentas). `AccountCard` muestra "Saldo actual" y el saldo inicial como dato secundario.

Fechas (`src/lib/dates.ts`, con tests): `todayInLima(now?)`, `currentMonthRange(now?)` (`{ from, to }`), `formatDate("2026-11-15") -> "15 nov 2026"` y `isValidDateString`. Nunca se usa `new Date("YYYY-MM-DD")` para formatear (evita corrimientos de zona horaria).

UI (responsive, dark, tokens):

- Resumen del período: tres tarjetas (Ingresos, Gastos, Balance) con `formatPen`.
- Filtros: rango de fechas (por defecto el mes actual en Lima), tipo, cuenta y categoría, con botón "Limpiar". En móvil se agrupan en un bloque plegable; desde `md` van en una fila.
- Listado: tarjetas en móvil (icono de categoría, nombre, cuenta, fecha, nota y monto) y filas en rejilla desde `md`. Gastos con signo "−" y `text-destructive`; ingresos con "+". Menú de acciones por fila (editar, eliminar) con destinos de 44 px en táctil.
- Formulario en diálogo: selector de tipo (Gasto / Ingreso), monto, fecha (por defecto hoy), cuenta, categoría (solo las del tipo elegido; al cambiar el tipo se limpia la categoría) y nota. Si no hay cuentas, se muestra un estado vacío con enlace a `/accounts`.
- Estados de carga (esqueletos), vacío (con y sin filtros activos) y error con "Reintentar". `loading.tsx` y `error.tsx` en la ruta.
- Paginación con `PaginationNav` ("Anterior", "Página X de Y", "Siguiente").

## Reutilizar

- Infraestructura de la 003: `AppError`, `ActionResult`, `runAction`, `unwrapResult`, `errorMessage`, `money.ts`, `useZodForm`, `QueryProvider`.
- Componentes compartidos: `PageHeader`, `EmptyState`, `ErrorMessage`, `ConfirmDialog`, `FormField`, `ResourceCard` (menú de acciones como referencia).
- shadcn ya instalado: `dialog`, `input`, `label`, `select`, `badge`, `skeleton`, `tabs`, `switch`, `alert`, `dropdown-menu`.
- Módulos `accounts` y `categories`: `useAccounts(false)`, `useCategories(false)`, `getCategoryIcon`, `ACCOUNT_TYPE_META`.
- Esquema de la spec 002 (`transactions`, índices, claves compuestas): no cambia, no hay migración.

## Archivos

Nuevos:

- `src/lib/dates.ts`, `src/lib/dates.test.ts`
- `src/components/shared/pagination-nav.tsx`
- `src/modules/transactions/schemas/transaction.schema.ts` (+ test), `types/transaction.types.ts`
- `src/modules/transactions/services/transactions.service.ts` (+ test con PGlite)
- `src/modules/transactions/actions/transactions.actions.ts`
- `src/modules/transactions/hooks/use-transactions.ts`, `use-transaction-mutations.ts`, `use-transaction-filters.ts`, `use-transaction-form.ts`, `use-transactions-manager.ts` (+ tests de los hooks con lógica)
- `src/modules/transactions/components/transactions-page.tsx`, `transactions-summary.tsx`, `transaction-filters.tsx`, `transaction-row.tsx`, `transaction-form-dialog.tsx`
- `src/app/(app)/transactions/page.tsx`, `loading.tsx`, `error.tsx`

Modificados:

- `src/modules/accounts/services/accounts.service.ts` (+ test): `list` devuelve `balanceCents`.
- `src/modules/accounts/types/account.types.ts`, `components/account-card.tsx`: mostrar saldo actual.
- `src/modules/shell/nav-items.ts`: entrada "Transacciones".
- `docs/architecture/system-design.md` (nota del saldo calculado en SQL).

## Criterios de aceptación

- AC1: se pueden crear, editar y eliminar transacciones de ingreso y gasto desde `/transactions`, y la lista, el resumen y los saldos se actualizan sin recargar.
- AC2: el monto se captura en PEN y se guarda en céntimos; entradas inválidas (`0`, negativos, `abc`, `1.234`, vacío) se rechazan con error de campo.
- AC3: elegir una categoría de un tipo distinto al de la transacción, o una cuenta o categoría ajena o archivada, se rechaza con error claro; un usuario nunca ve ni modifica transacciones de otro (`NOT_FOUND`).
- AC4: los filtros por fechas, tipo, cuenta y categoría combinan entre sí; por defecto se ve el mes actual en Lima; "Limpiar" restablece ese período.
- AC5: el listado está ordenado por fecha descendente, paginado de 20 en 20, y el total de páginas es correcto; una página fuera de rango no rompe.
- AC6: el resumen (ingresos, gastos, balance) corresponde a **todo** el conjunto filtrado, no solo a la página visible.
- AC7: `/accounts` muestra el saldo actual de cada cuenta = inicial + ingresos − gastos, calculado en una sola consulta; coincide tras crear, editar o eliminar transacciones.
- AC8: las fechas se muestran y guardan sin corrimientos de zona horaria; "hoy" usa `America/Lima`, incluso cerca de la medianoche UTC.
- AC9: todo error llega como `ActionResult` con mensaje seguro; no hay mensajes crudos de Postgres, Neon o Clerk.
- AC10: los componentes no contienen `useState`, `useEffect` ni llamadas a acciones; la lógica está en hooks. No se pasan funciones ni componentes de servidor a cliente (iconos como elementos renderizados).
- AC11: `/transactions` es responsive (360, 768, 1280 px, sin scroll horizontal), funciona en claro y oscuro, usa solo tokens y tiene estados de carga, vacío (con y sin filtros) y error.
- AC12: la navegación muestra "Transacciones" con el enlace activo resaltado.
- AC13: `npm run lint`, `npm run test` y `npm run build` pasan.
- AC14 (manual, con sesión): el flujo completo funciona en el navegador contra Neon.

## Tests requeridos

(Vitest; el servicio con PGlite y las migraciones reales)

- `dates.test.ts`: `todayInLima` (incluye un instante `2026-11-16T03:00:00Z`, que en Lima todavía es el 15), `currentMonthRange`, `formatDate`, `isValidDateString` (días y años bisiestos, fechas inexistentes).
- `transaction.schema.test.ts`: casos válidos e inválidos; filtros con `from > to`, `pageSize` fuera de rango; nota de 281 caracteres.
- `transactions.service.test.ts`: CRUD; cuenta o categoría ajena, archivada o de tipo distinto (errores de campo); aislamiento entre usuarios en leer, editar y eliminar; filtros combinados; orden y paginación (incluida página fuera de rango); `totals` del conjunto completo; editar conservando una cuenta archivada después.
- `accounts.service.test.ts` (ampliado): `balanceCents` con ingresos y gastos, cuenta sin movimientos y saldo inicial negativo.
- `use-transaction-filters.test.ts`: período por defecto, cambio de filtros que reinicia la página, "Limpiar".
- `use-transaction-form.test.tsx` y `use-transactions-manager.test.tsx`: monto en céntimos, categoría que se limpia al cambiar el tipo, mapeo de errores de campo del servidor, eliminar con confirmación y error visible.
- Componentes presentacionales: sin test unitario; se verifican en el navegador.

## Orden de implementación

1. `dates.ts` y sus tests; schemas; servicio con sus tests (incluye ampliar `accounts.service` con saldo).
2. Acciones, hooks y sus tests.
3. Componentes, página, `loading` / `error`, navegación y `PaginationNav`.
4. Lint, tests, build y verificación en el navegador.

## Preguntas abiertas

1. **Período por defecto.** Se propone el mes actual. ¿Prefieres "últimos 30 días" o sin filtro de fechas?
2. **Fechas futuras.** Se permiten (por ejemplo, un gasto programado para mañana). ¿Prefieres bloquearlas?
3. **Cambiar el tipo al editar.** Se permite (limpia la categoría). Alternativa: bloquear el tipo al editar, como en las categorías.
4. **Revisión.** Esta spec toca dinero y reglas de negocio: se propone pasar el `reviewer` al terminar, con tu OK.

## Próximas fases

- 005: transferencias entre cuentas (tabla `transfers`, migración nueva y saldo que las incluye).
- 006: presupuestos. 007: dashboard.
