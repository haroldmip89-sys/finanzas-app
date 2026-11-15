# Calibración de saldos

Estado: hecha

## Objetivo

Cuando el saldo de una cuenta en la app no coincide con el real (porque hay gastos sin cargar y no se quieren insertar uno por uno), el usuario escribe el **saldo real** y la app registra **un solo ajuste** por la diferencia. El ajuste mueve el saldo de la cuenta pero **no cuenta como ingreso ni gasto** en totales, presupuestos ni análisis. Referencias: `docs/BRIEF.md §5.4, §8 y §11 (decisión 1)`, `system-design.md §2` (invariante 2).

Decisión de diseño (la recomendada en el brief): el ajuste es una **transacción normal** cuyo categoría es una **categoría de sistema**. No se añade un tipo nuevo de transacción ni un campo duplicado: "es un ajuste" se deduce de la categoría, de modo que la clave compuesta que ya liga tipo y categoría sigue garantizando la coherencia.

## Alcance

- Incluye:
  - Categorías de sistema "Ajuste de saldo" (una de ingreso y una de gasto), creadas la primera vez que se calibra, ocultas al usuario y no usables en transacciones normales.
  - Módulo `src/modules/calibration`: servicio atómico, acción, hooks y diálogo de calibración.
  - Acceso desde la tarjeta de cada cuenta ("Calibrar saldo") y como cuarto botón de las acciones rápidas del inicio.
  - Los ajustes se ven en Movimientos con la etiqueta "Ajuste" y no entran en los totales de ingresos y gastos.
  - Migración nueva para `categories.system_key`.
- No incluye:
  - Calibrar a una fecha pasada: el ajuste se fecha con el día actual en Lima.
  - Editar un ajuste (se puede eliminar para deshacer la calibración).
  - Conciliación línea por línea con el estado de cuenta del banco, importaciones o sugerencias automáticas.
  - Tratamiento especial de tarjetas de crédito (spec 007a): aquí se escribe el saldo con su signo, y una deuda se escribe en negativo.
  - Presupuestos y dashboard (ya excluirán los ajustes cuando existan).

## Reglas de negocio

- El usuario escribe el **saldo real** de la cuenta, en PEN con hasta 2 decimales y signo opcional.
- Diferencia = saldo real − saldo actual calculado. Si es 0 no se crea nada y se informa "El saldo ya coincide": esto también hace seguros los reintentos y los doble clic (un segundo envío calcula diferencia 0).
- Diferencia > 0: ajuste de **ingreso** por ese importe. Diferencia < 0: ajuste de **gasto** por el valor absoluto.
- Tras calibrar, el saldo calculado de la cuenta es exactamente el saldo real escrito.
- La nota del ajuste se genera sola, por ejemplo "Calibración de saldo: de S/ 800.00 a S/ 820.00", para dejar rastro.
- No se puede calibrar una cuenta archivada ni de otro usuario.
- La lectura del saldo y la creación del ajuste ocurren en **una sola transacción de base de datos**.
- Las categorías de sistema no se listan, no se editan, no se archivan, no se eliminan y no se pueden elegir al crear o editar una transacción normal; tampoco aparecen entre las categorías más usadas.
- Un ajuste se puede eliminar (deshace la calibración y el saldo vuelve a su valor anterior). No se puede editar.
- Los ajustes se excluyen de los totales de ingresos y gastos; sí afectan el saldo de la cuenta y aparecen en el listado de Movimientos.

## Diseño

Esquema (migración nueva `drizzle/0002_*.sql`, aditiva; no se edita ninguna anterior):

- `categories.system_key text null`. Valores permitidos: `adjustment_income` y `adjustment_expense`.
- `CHECK`: `system_key IS NULL` o la combinación válida (`adjustment_income` con `kind = 'income'`, `adjustment_expense` con `kind = 'expense'`).
- Única (`user_id`, `system_key`): como los `NULL` no chocan entre sí, solo limita las categorías de sistema a una por clave y usuario.
- Las categorías de sistema se crean con `INSERT ... ON CONFLICT DO NOTHING`, así dos calibraciones simultáneas no duplican.

Servicio de calibración (`createCalibrationService(db)`):

1. Valida el input con Zod: `accountId` y `realBalanceCents` entero dentro del rango.
2. Abre una transacción de base de datos.
3. Verifica que la cuenta es del usuario y no está archivada (si no, `NOT_FOUND` o error de campo).
4. Lee el saldo calculado con la misma expresión SQL del saldo de cuentas, que se extrae a una función compartida para que exista una única fórmula (inicial + ingresos − gastos + transferencias recibidas − enviadas, ajustes incluidos).
5. Calcula la diferencia; si es 0, lanza `VALIDATION` con el mensaje "El saldo ya coincide".
6. Asegura la categoría de sistema del tipo correspondiente, inserta la transacción de ajuste con la nota generada y la fecha de hoy en Lima, y devuelve `{ previousBalanceCents, newBalanceCents, differenceCents, transactionId }`.

Efectos en otros módulos:

- `categoriesService`: `list`, `update`, `archive`, `unarchive` y `remove` ignoran las categorías de sistema (`system_key IS NULL`); `ensureDefaults` cuenta solo categorías normales, de modo que calibrar antes de visitar Categorías no impide sembrar las categorías por defecto.
- `transactionsService`: `assertReferences` rechaza una categoría de sistema con error de campo; `frequentCategories` y el selector de categorías del formulario las excluyen; `list` incluye `isAdjustment` en cada fila y `totals` ignora los ajustes (une con `categories` y filtra `system_key IS NULL`).
- Interfaz de Movimientos: la fila de un ajuste muestra la etiqueta "Ajuste", sin acción "Editar" y con "Eliminar"; bajo el resumen se muestra "Los ajustes de saldo no se cuentan en estos totales".
- `accountsService.list`: el saldo ya incluye los ajustes por ser transacciones; solo cambia la extracción de la fórmula.

Interfaz de calibración:

- Diálogo/sheet "Calibrar saldo": cuenta (fija si viene de la tarjeta; selector de cuentas activas si viene del inicio), **saldo en la app** (solo lectura), campo **saldo real** (`MoneyInput` con signo) y una vista previa de la diferencia ("Diferencia: +S/ 20.00 · se registrará un ingreso de ajuste" o equivalente para gasto, o "El saldo ya coincide" con el botón deshabilitado).
- Tras confirmar: toast "Saldo calibrado · BBVA: S/ 820.00", y se refrescan las cuentas y las transacciones.
- Acciones rápidas del inicio: grilla de 2 columnas en móvil y 4 desde `sm`, con el nuevo botón "Calibrar saldos". El botón "+" y su menú siguen con tres opciones.

## Reutilizar

- Infraestructura: `AppError`, `runAction`, `unwrapResult`, `errorMessage`, `money.ts` (`MoneyInput`, `formatPen`), `dates.ts` (`todayInLima`), `useZodForm`, `EntitySelect`, `FormField`, `ErrorMessage`, `QueryProvider`, toasts con `sonner`.
- `QuickAddProvider` y `useQuickAdd` (se amplía con el tipo `calibrate`), `QuickActions`, `AccountCard`, `ResourceCard`.
- Expresión SQL del saldo de `accounts.service.ts` (se extrae, no se duplica).
- `src/db/test-db.ts` (PGlite con las migraciones reales).

## Archivos

Esquema y migración:

- `src/db/schema/categories.table.ts` (columna, `CHECK` y única), `drizzle/0002_*.sql` y `drizzle/meta/*` (generados)
- `src/db/schema/constraints.test.ts` y `src/db/migrations.test.ts` (ampliados)

Módulo `calibration` (`src/modules/calibration/`):

- `schemas/calibration.schema.ts` (+ test), `types/calibration.types.ts`
- `services/calibration.service.ts` (+ test con PGlite)
- `actions/calibration.actions.ts`
- `hooks/use-calibrate-account.ts`, `use-calibration-form.ts` (+ tests)
- `components/calibration-dialog.tsx`

Módulos existentes (modificados):

- `src/modules/accounts/services/accounts.service.ts` (+ test): fórmula del saldo extraída; `components/account-card.tsx` y `hooks/use-accounts-manager.ts`: acción "Calibrar saldo".
- `src/modules/categories/services/categories.service.ts` (+ test), `constants/default-categories.ts` no cambia.
- `src/modules/transactions/services/transactions.service.ts` (+ test), `types/transaction.types.ts`, `components/transaction-row.tsx`, `transactions-summary.tsx`, `hooks/use-transactions-manager.ts` si hace falta.
- `src/modules/quick-add/hooks/use-quick-add.ts` (+ test), `components/quick-add-provider.tsx`, `quick-actions.tsx` (+ `quick-add.test.tsx`).
- `docs/architecture/system-design.md` (módulo `calibration` en `§4`, `categories.system_key` en `§2`).

## Criterios de aceptación

- AC1: desde la tarjeta de una cuenta y desde el inicio se abre "Calibrar saldo"; muestra el saldo en la app, acepta el saldo real con signo y muestra la diferencia antes de confirmar.
- AC2: calibrar con saldo real mayor crea un ajuste de ingreso y con saldo real menor uno de gasto, por la diferencia exacta; después el saldo de la cuenta es exactamente el escrito.
- AC3: con diferencia 0 no se crea nada y se informa que el saldo ya coincide; repetir el envío o hacer doble clic no crea un segundo ajuste.
- AC4: los ajustes no cuentan en los totales de ingresos y gastos de Movimientos, pero sí aparecen en el listado con la etiqueta "Ajuste", sin opción de editar y con opción de eliminar.
- AC5: eliminar un ajuste devuelve el saldo de la cuenta a su valor previo.
- AC6: las categorías de sistema no aparecen en Categorías, en el selector de categorías ni entre las más usadas; no se pueden editar, archivar, eliminar ni usar al registrar una transacción normal (error claro o `NOT_FOUND`).
- AC7: calibrar antes de visitar Categorías no impide que se siembren las categorías por defecto.
- AC8: no se puede calibrar una cuenta archivada ni de otro usuario; un usuario nunca ve ni modifica ajustes de otro.
- AC9: la base rechaza una categoría de sistema con clave y tipo incompatibles y una segunda categoría de sistema con la misma clave para el mismo usuario; dos calibraciones simultáneas no duplican la categoría de sistema.
- AC10: la lectura del saldo y el ajuste ocurren en una transacción de base de datos; la fórmula del saldo existe en un único lugar.
- AC11: todo error llega como `ActionResult` con mensaje seguro; la lógica está en hooks; no se pasan funciones ni componentes de servidor a cliente.
- AC12: el diálogo es un bottom sheet en móvil y un diálogo centrado en escritorio, responsive (360, 768 y 1280 px, sin scroll horizontal), en claro y oscuro con solo tokens; las acciones rápidas del inicio se ven bien con 4 botones.
- AC13: `npm run lint`, `npm run test` y `npm run build` pasan; la migración se aplica desde cero en PGlite.
- AC14 (manual, con sesión): el flujo completo funciona en el navegador contra Neon, previa `npm run db:migrate` con confirmación.

## Tests requeridos

(Vitest; servicio y restricciones con PGlite y las migraciones reales)

- `constraints.test.ts` / `migrations.test.ts`: `system_key` con clave y tipo incompatibles se rechaza; segunda categoría de sistema con la misma clave y usuario se rechaza; dos usuarios pueden tener la suya; columna presente tras migrar.
- `calibration.schema.test.ts`: entradas válidas e inválidas (id, entero, rango).
- `calibration.service.test.ts`: diferencia positiva (ingreso) y negativa (gasto) con el saldo final exacto; diferencia 0 (error y sin filas nuevas); segundo envío idéntico sin duplicar; cuenta con transferencias y transacciones previas; saldo inicial y resultado negativos (tarjeta); cuenta archivada y ajena rechazadas; nota generada; categorías de sistema creadas una vez y reutilizadas, incluso con llamadas concurrentes; fecha de hoy en Lima.
- `categories.service.test.ts` (ampliado): `list` oculta las de sistema; `update`, `archive`, `unarchive` y `remove` sobre una de sistema devuelven `NOT_FOUND`; `ensureDefaults` siembra aunque ya existan categorías de sistema.
- `transactions.service.test.ts` (ampliado): crear o editar con una categoría de sistema se rechaza; `frequentCategories` las excluye; `list` marca `isAdjustment` y `totals` los ignora mientras el listado los incluye; eliminar un ajuste restituye el saldo.
- `accounts.service.test.ts` (ampliado): el saldo incluye los ajustes y la fórmula extraída mantiene todos los casos previos.
- `use-calibration-form.test.tsx`: vista previa de la diferencia (positiva, negativa, cero con botón deshabilitado), monto con signo, mapeo de errores de campo y generales, toast con el resultado.
- `use-quick-add.test.tsx` y `quick-add.test.tsx` (ampliados): el tipo `calibrate` abre el diálogo y el inicio muestra los cuatro botones.
- Componentes presentacionales: sin test unitario; se verifican en el navegador.

## Orden de implementación

1. Esquema, migración y tests de restricciones; extraer la fórmula del saldo.
2. Servicio de calibración y cambios en `categories` y `transactions`, con sus tests.
3. Acción, hooks y sus tests.
4. Diálogo, acceso desde la tarjeta de cuenta y desde el inicio, etiqueta "Ajuste" y nota bajo el resumen.
5. Lint, tests, build, prueba en vivo en Neon (tras aplicar la migración con confirmación) y verificación en el navegador.

## Preguntas abiertas

1. **Fecha del ajuste.** Siempre el día actual en Lima, sin poder cambiarla. ¿Basta o necesitas fechar un ajuste hacia atrás?
2. **Eliminar ajustes.** Se permite (deshace la calibración) y no se permite editarlos. ¿De acuerdo?
3. **Tarjetas.** Hasta la spec 007a, la deuda se escribe como saldo negativo. ¿Aceptable?
4. **Revisión.** La spec maneja dinero y una migración: se propone pasar el `reviewer` al terminar, con tu OK.
5. **Migración en Neon.** `npm run db:migrate` modifica tu base: se ejecuta solo con tu confirmación.

## Próximas fases

- 007a: tarjetas de crédito (la calibración de una tarjeta mostrará la deuda). 008: presupuestos, que excluirán los ajustes. 009a y 009: dinero disponible y dashboard, que también los excluirán de los gastos.
