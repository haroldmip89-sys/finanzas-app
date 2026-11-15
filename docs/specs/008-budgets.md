# Presupuestos mensuales y vista de Análisis

Estado: hecha

## Objetivo

El usuario fija **cuánto quiere gastar por categoría cada mes** y ve, en una vista propia, cuánto lleva gastado y cuánto le queda, sin culpas ni alarmas. Es la respuesta a "¿estoy gastando más de lo que debería?" (`docs/BRIEF.md §1 y §5.6`). Incluye la **vista de presupuestos** y el cuarto destino de navegación, **Análisis**, que se había reservado para esta spec (`006b`).

Referencias: `system-design.md §2` (`budgets`, que ya existe desde la spec 002: no hace falta migración), `§4` (el módulo `budgets` lee `transactions` y `categories`).

## Alcance

- Incluye:
  - Módulo `src/modules/budgets`: schemas, servicio, acciones, hooks y componentes.
  - Vista **Análisis** (`/analysis`) con los presupuestos del mes, navegación entre meses, totales y detalle por categoría con barra de avance.
  - Crear, editar y eliminar el presupuesto de una categoría en un mes.
  - **Copiar los presupuestos del mes anterior** con un toque (para no teclear todo cada mes).
  - Lista de **gastos del mes sin presupuesto**, con atajo para presupuestarlos.
  - Cuarto destino **Análisis** en la barra inferior y en el menú lateral.
  - Ayudantes de meses en `src/lib/dates.ts` y componente compartido de barra de progreso.
- No incluye:
  - Presupuesto total o por cuenta, presupuestos de ingresos, presupuestos semanales o recurrentes automáticos.
  - Alertas o notificaciones.
  - Resumen mensual y semanal, gráficos o el inicio con presupuesto restante (specs 009 y 010b).
  - Cambios de esquema: la tabla `budgets` y sus restricciones ya existen.
  - Rediseño visual: la spec 012 restilará esta vista.

## Reglas de negocio

- Un presupuesto es **una categoría de gasto + un mes + un importe en PEN** mayor que 0. Hay como máximo uno por categoría y mes (lo impone la base).
- Solo categorías de **gasto** del usuario, no archivadas al crear (la base ya impide ingresos y categorías ajenas). Las categorías de sistema (ajustes) no se pueden presupuestar.
- El mes se identifica como `YYYY-MM` en `America/Lima` y se guarda como su primer día.
- **Gastado** de un presupuesto = suma de los gastos de esa categoría durante el mes, en **todas las cuentas** (las compras con tarjeta cuentan). No cuentan ingresos, transferencias ni ajustes de saldo.
- **Estados** por presupuesto, solo según el porcentaje gastado: holgado (menos de 80 %), cerca del límite (de 80 % a 100 %) y excedido (más de 100 %). El estado nunca se comunica solo con color: va con texto neutro ("Te quedan S/ 40.00", "Cerca del límite", "Excedido por S/ 12.00").
- **Totales del mes:** presupuestado (suma de importes), gastado en esas categorías y restante (presupuestado − gastado, puede ser negativo).
- **Sin presupuesto:** categorías con gasto en el mes y sin presupuesto, ordenadas de mayor a menor gasto, con su importe.
- **Copiar del mes anterior:** crea, en el mes actual de la vista, los presupuestos del mes anterior para categorías **activas** que aún no tienen uno; no pisa nada existente. Si el mes anterior no tiene presupuestos, informa en vez de fallar.
- Editar cambia solo el importe (la categoría y el mes no se editan); eliminar un presupuesto es físico, con confirmación.
- Un mes pasado o futuro se puede presupuestar y consultar igual que el actual.

## Diseño

Capas, como en las specs anteriores: server action (auth + Zod) → servicio con fábrica `createBudgetsService(db)` (reglas de negocio, siempre filtra por `userId`, lanza `AppError`) → restricciones de la base como última defensa (únicos, claves compuestas y `CHECK` de la spec 002).

Servicio (`budgetsService`):

- `list(userId, month)` devuelve `{ month, items, unbudgeted, totals }`:
  - `items`: presupuestos del mes con `categoryName`, `categoryIcon`, `amountCents` y `spentCents` (subconsulta correlacionada con columnas calificadas a mano, una sola consulta), ordenados del más consumido al menos consumido y luego por nombre.
  - `unbudgeted`: una consulta agrupada con el gasto del mes por categoría sin presupuesto.
  - `totals`: `{ budgetedCents, spentCents, remainingCents }`.
- `create(userId, { categoryId, month, amountCents })`: valida categoría de gasto activa del usuario; duplicado → error de campo.
- `update(userId, id, { amountCents })` y `remove(userId, id)`: `NOT_FOUND` si no es del usuario.
- `copyFromPreviousMonth(userId, month)`: lee los presupuestos del mes anterior de categorías activas y los inserta con `ON CONFLICT DO NOTHING` (seguro ante repeticiones y llamadas simultáneas); devuelve cuántos creó.

Funciones puras (con tests): `getBudgetStatus(amountCents, spentCents)` → `{ percent, state, remainingCents }` y los ayudantes de mes en `dates.ts` (`currentMonthKey`, `addMonths`, `monthKeyRange`, `formatMonth`).

Interfaz:

- **Análisis** (`/analysis`): cabecera con selector de mes (flechas anterior y siguiente de 44 px, nombre del mes y atajo "Este mes"), tres cifras (**Presupuestado**, **Gastado**, **Restante**), lista de presupuestos y sección "Gastos sin presupuesto".
- **Tarjeta de presupuesto:** icono y nombre de la categoría, "S/ 120.00 de S/ 200.00", barra de progreso accesible (`role="progressbar"` con valores), texto de estado y menú (Editar, Eliminar). Una barra nunca pasa de 100 % de ancho; el exceso se dice con texto.
- **Vacío:** si el mes no tiene presupuestos, mensaje con dos acciones: "Copiar del mes anterior" (solo si el anterior tiene) y "Agregar presupuesto".
- **Sin presupuesto:** filas con categoría y gasto, y un botón "Presupuestar" que abre el formulario con esa categoría elegida.
- **Formulario** (bottom sheet en móvil, diálogo centrado en escritorio): categoría (solo de gasto, activas y sin presupuesto en ese mes) e importe con `MoneyInput`; al editar, la categoría es fija.
- Estados de carga (esqueletos), vacío y error con reintento; `loading.tsx` y `error.tsx` de la ruta.
- Navegación: **Análisis** como cuarto destino; las demás pantallas no cambian.

## Reutilizar

- Infraestructura: `AppError`, `ActionResult`, `runAction`, `unwrapResult`, `errorMessage`, `money.ts` (`MoneyInput`, `formatPen`), `dates.ts`, `useZodForm`, `FormField`, `EntitySelect`, `ErrorMessage`, `ConfirmDialog`, `EmptyState`, `PageHeader`, `ResourceCard`, `QueryProvider` y toasts con `sonner`.
- `getCategoryIcon` y `useCategories` del módulo `categories`; el esquema de `budgets` de la spec 002; `src/db/test-db.ts`.
- `nav-items.ts`, `NavLink`, `BottomNav` y `AppSidebar` (solo se agrega un destino).

## Archivos

Nuevos:

- `src/modules/budgets/schemas/budget.schema.ts` (+ test), `types/budget.types.ts`
- `src/modules/budgets/budget-status.ts` (+ test)
- `src/modules/budgets/services/budgets.service.ts` (+ test con PGlite)
- `src/modules/budgets/actions/budgets.actions.ts`
- `src/modules/budgets/hooks/use-budgets.ts`, `use-budget-mutations.ts`, `use-budget-form.ts`, `use-budgets-manager.ts` (+ tests de los hooks con lógica)
- `src/modules/budgets/components/budgets-page.tsx`, `budget-card.tsx`, `budgets-summary.tsx`, `unbudgeted-list.tsx`, `month-switcher.tsx`, `budget-form-dialog.tsx`
- `src/components/shared/progress-bar.tsx`
- `src/app/(app)/analysis/page.tsx`, `loading.tsx`, `error.tsx`

Modificados:

- `src/lib/dates.ts` (+ test): ayudantes de mes.
- `src/modules/shell/nav-items.ts` (+ test): destino Análisis.
- `docs/architecture/system-design.md` (módulo `budgets` y regla del gasto de presupuesto), `docs/BRIEF.md` (estado).

## Criterios de aceptación

- AC1: `/analysis` muestra los presupuestos del mes elegido con categoría, gastado, presupuestado, barra y estado; Análisis aparece como cuarto destino y se resalta en esa ruta.
- AC2: se puede crear, editar el importe y eliminar un presupuesto; la lista y los totales se actualizan sin recargar.
- AC3: el gasto de un presupuesto cuenta los gastos de la categoría en todas las cuentas, incluidas tarjetas, y no cuenta ingresos, transferencias ni ajustes de saldo; respeta los límites del mes en Lima (primer y último día inclusive).
- AC4: el estado es holgado, cerca o excedido según el porcentaje (79 %, 80 %, 100 % y 101 % caen en el estado correcto); el exceso se comunica con texto y la barra no pasa de 100 %.
- AC5: los totales son presupuestado, gastado en esas categorías y restante (que puede ser negativo) y coinciden con la suma de las tarjetas.
- AC6: "Gastos sin presupuesto" lista las categorías con gasto y sin presupuesto en el mes, de mayor a menor, y "Presupuestar" abre el formulario con la categoría ya elegida.
- AC7: no se puede crear un segundo presupuesto para la misma categoría y mes (error de campo claro), ni para categorías de ingreso, archivadas, ajenas o de sistema.
- AC8: "Copiar del mes anterior" crea los presupuestos faltantes de categorías activas, no pisa los existentes y avisa cuando el mes anterior está vacío.
- AC9: se puede navegar a meses pasados y futuros y volver con "Este mes"; cambiar de mes no mezcla datos de otro.
- AC10: un usuario nunca ve ni modifica presupuestos de otro (`NOT_FOUND`) y su gasto nunca incluye movimientos ajenos.
- AC11: eliminar una categoría con presupuestos devuelve el error de "en uso" (ya existente) y la sugerencia de archivarla.
- AC12: todo error llega como `ActionResult` con mensaje seguro; la lógica está en hooks y funciones puras; no se pasan funciones ni componentes de servidor a cliente.
- AC13: responsive (360, 768 y 1280 px, sin scroll horizontal; nombres largos recortados con `min-w-0`), en claro y oscuro con solo tokens; la barra inferior con cuatro destinos cabe a 360 px.
- AC14: `npm run lint`, `npm run test` y `npm run build` pasan; no hay migración.
- AC15 (manual, con sesión): el flujo completo funciona en el navegador contra Neon.

## Tests requeridos

(Vitest; el servicio con PGlite y las migraciones reales)

- `dates.test.ts` (ampliado): `currentMonthKey` con la zona horaria de Lima, `addMonths` (cruces de año), `monthKeyRange` (febrero bisiesto) y `formatMonth` ("noviembre 2026").
- `budget-status.test.ts`: porcentaje y estado en los límites (0 %, 79 %, 80 %, 100 %, 101 %), presupuesto con gasto cero, restante negativo y barra topada en 100 %.
- `budget.schema.test.ts`: importes válidos e inválidos, mes con formato correcto, ids.
- `budgets.service.test.ts`: crear, duplicado, categorías de ingreso, archivadas, ajenas y de sistema rechazadas; editar y eliminar; aislamiento entre usuarios; gastado solo de gastos de la categoría en todas las cuentas, sin ingresos, transferencias ni ajustes; límites de mes; totales; orden por consumo; "sin presupuesto" agrupado y ordenado; copiar del mes anterior (crea, no pisa, ignora archivadas, mes vacío, repetir no duplica).
- `use-budget-form.test.tsx`, `use-budgets-manager.test.tsx`: monto en céntimos, mapeo de errores de campo del servidor, cambio de mes, copiar del mes anterior, eliminar con confirmación y error visible, categoría preelegida desde "Presupuestar".
- `nav-items.test.ts` (ampliado): cuatro destinos principales y exactamente uno resaltado por ruta.
- Componentes presentacionales: sin test unitario; se verifican en el navegador.

## Orden de implementación

1. Ayudantes de mes y `getBudgetStatus` con sus tests.
2. Schemas y servicio con sus tests (incluido copiar del mes anterior y "sin presupuesto").
3. Acciones, hooks y sus tests.
4. Componentes, ruta de Análisis y el destino en la navegación.
5. Lint, tests, build, prueba en vivo en Neon (datos temporales) y verificación en el navegador.

## Preguntas abiertas

1. **Nombre y ruta.** La vista vive en `/analysis` bajo el destino **Análisis**, que más adelante sumará resumen mensual y semanal. ¿Prefieres llamarla "Presupuestos" y darle su propio destino?
2. **Umbral de "cerca del límite".** Se propone 80 %. ¿Te sirve?
3. **Copiar del mes anterior.** Solo copia, no crea presupuestos automáticos cada mes para no registrar cosas que no pediste. ¿De acuerdo?
4. **Diseño.** Esta vista se implementa con los componentes actuales; la spec 012 la restila cuando llegue el diseño del artifact. ¿De acuerdo en no esperar?
5. **Revisión.** Spec con dinero pero sin migración: se propone pasar el `reviewer` al terminar, con tu OK.

## Próximas fases

- 009a y 009: dinero disponible y dashboard, que reutilizan los totales de presupuesto.
- 010b: resumen semanal, dentro de Análisis.
