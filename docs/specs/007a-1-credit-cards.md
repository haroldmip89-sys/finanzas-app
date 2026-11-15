# Tarjetas de crédito (versión ligera)

Estado: hecha

## Objetivo

Ayudar a **depender menos de las tarjetas** sin pedir más trabajo al usuario: no hay fechas de cierre ni de pago, ni límite, ni cuotas. Todo se deduce de lo que ya se registra (compras con tarjeta como gastos de la cuenta-tarjeta, pagos como transferencias). Cubre lo esencial de `docs/BRIEF.md §5.5`: tratar la tarjeta como **deuda y no como dinero líquido**, ver cuánto se debe, cuánto se está comprando con tarjeta cada mes, y pagarla fácilmente.

Referencias: `system-design.md §2` (cuentas, transferencias, invariante 2). **No hay migración ni cambios en la base de datos.**

## Alcance

- Incluye:
  - Clasificación **líquida / crédito derivada del tipo** (efectivo, banco y billetera son líquidos; tarjeta es crédito), en un solo lugar.
  - `/accounts` separa **Cuentas** y **Tarjetas de crédito**, con tres cifras arriba: **Dinero líquido**, **Deuda de tarjetas** y **Compras con tarjeta este mes** (comparada con el mes anterior).
  - En una tarjeta, el saldo se muestra como **Deuda** (o "Saldo a favor" si es positivo) y se escribe como **número positivo** al crear, editar y calibrar.
  - Acción **"Pagar tarjeta"**: abre la transferencia con la tarjeta como destino y el monto sugerido igual a la deuda, eligiendo solo entre cuentas líquidas.
- No incluye:
  - Día de cierre, día de pago, límite de crédito, compras en cuotas, vencimientos, intereses calculados, pago mínimo y devoluciones asociadas a la compra.
  - Avisos o notificaciones.
  - Impedir gastos por encima de un límite.
  - El indicador de dinero disponible (spec 009a) y el dashboard (009): esta spec solo deja disponibles las cifras que usarán.
  - Cambios de esquema.

## Reglas de negocio

- **Líquida o crédito:** `cash`, `bank` y `wallet` son líquidas; `card` es de crédito. No hay campo nuevo.
- **Deuda** de una tarjeta = su saldo negativo en positivo (`max(0, −saldo)`). Un saldo positivo se muestra como "Saldo a favor".
- **Dinero líquido** = suma de saldos de cuentas líquidas no archivadas. **Deuda de tarjetas** = suma de la deuda de tarjetas no archivadas.
- **Compras con tarjeta del mes** = suma de gastos registrados en cuentas tipo tarjeta durante el mes actual en Lima, **sin contar ajustes de saldo**; se compara con el mes anterior completo. Los pagos de la tarjeta son transferencias y no cuentan como compras.
- **Pagar tarjeta** es una transferencia de una cuenta líquida a la tarjeta: baja el saldo de origen, reduce la deuda y no cuenta como ingreso ni gasto.
- **Deuda escrita en positivo:** para una tarjeta, el campo "Deuda" positivo se guarda como saldo inicial negativo, y al editar se muestra otra vez positivo. Calibrar una tarjeta pide la **deuda real** en positivo y se envía a la calibración existente con el signo invertido. El servidor y los cálculos no cambian.
- Para ver la deuda real, incluidas cuotas que el banco ya tenga cargadas, basta **calibrar la tarjeta** con la deuda que muestra el banco: no hay que registrar las cuotas.

## Diseño

Reglas en un solo lugar (`src/modules/accounts/`):

- `account-kind.ts`: `isCreditAccount(type)` e `isLiquidAccount(type)`.
- `card-summary.ts` (funciones puras): `getDebtCents(balance)`, `sumLiquidBalance(accounts)`, `sumCardDebt(accounts)`.
- `accountsService.cardSpending(userId, range)`: una consulta SQL que suma los gastos de cuentas tipo tarjeta entre dos fechas, excluyendo categorías de sistema (ajustes); se llama para el mes actual y el anterior (rangos con `currentMonthRange` y `addDays`).

Interfaz:

- `/accounts`: arriba, tres cifras (**Dinero líquido**, **Deuda de tarjetas**, **Compras con tarjeta este mes** con la diferencia frente al mes anterior); debajo, la sección **Cuentas** y la sección **Tarjetas de crédito** (solo si hay tarjetas), con "Mostrar archivadas" aplicado a ambas.
- Tarjeta de crédito: nombre, **Deuda** (o "Saldo a favor") y menú: Editar, **Pagar tarjeta**, Calibrar saldo, Archivar, Eliminar. Una tarjeta archivada no se paga ni se calibra; las cuentas líquidas no ofrecen "Pagar tarjeta".
- Formulario de cuenta: al elegir "Tarjeta", el saldo se llama **Deuda actual (S/)** y se escribe positivo; no aparece ningún campo nuevo.
- **Pagar tarjeta:** abre el formulario de transferencia con la tarjeta como destino fijo, el monto sugerido igual a la deuda (editable; vacío si no hay deuda) y como origen solo cuentas líquidas activas. Se abre mediante el sistema de acciones rápidas con un nuevo tipo `pay-card` y la cuenta.
- **Calibrar una tarjeta:** el diálogo pide **Deuda real** en positivo y la vista previa habla de deuda ("la deuda sube en S/ 20.00" / "baja"); se envía con el signo invertido.

## Reutilizar

- Transferencias de la spec 005 (servicio, formulario, saldo): el pago es una transferencia normal.
- Calibración de la spec 007 y sus categorías de sistema.
- `QuickAddProvider` y `useQuickAdd` (se amplía con `pay-card`), `TransferFormDialog` y `useTransferForm` (valores iniciales y origen líquido), `CalibrationDialog` y `useCalibrationForm` (signo de la deuda), `AccountCard`, `AccountFormDialog` y `useAccountForm` (deuda en positivo), `ResourceCard`.
- `MoneyInput`, `formatPen`, `centsToPen`, `penToCents`, `currentMonthRange`, `addDays`, `src/db/test-db.ts`.

## Archivos

Nuevos:

- `src/modules/accounts/account-kind.ts` (+ test), `card-summary.ts` (+ test)
- `src/modules/accounts/components/accounts-summary.tsx`

Modificados:

- `src/modules/accounts/services/accounts.service.ts` (+ test): `cardSpending`.
- `src/modules/accounts/actions/accounts.actions.ts`, `hooks/use-accounts.ts` (consulta del gasto con tarjeta), `hooks/use-accounts-manager.ts`
- `src/modules/accounts/schemas/account.schema.ts` (+ test) y `hooks/use-account-form.ts` (+ test): deuda en positivo para tarjetas.
- `src/modules/accounts/components/account-card.tsx`, `accounts-page.tsx`, `account-form-dialog.tsx`
- `src/modules/transfers/hooks/use-transfer-form.ts` (+ test) y `components/transfer-form-dialog.tsx`
- `src/modules/calibration/hooks/use-calibration-form.ts` (+ test) y `components/calibration-dialog.tsx`
- `src/modules/quick-add/hooks/use-quick-add.ts` (+ test), `components/quick-add-provider.tsx` (+ `quick-add.test.tsx`)
- `docs/BRIEF.md` (§5.5 y roadmap), `docs/architecture/system-design.md` (nota de clasificación líquida/crédito).

## Criterios de aceptación

- AC1: `/accounts` separa **Cuentas** y **Tarjetas de crédito** y muestra **Dinero líquido** (cuentas líquidas no archivadas) y **Deuda de tarjetas** (tarjetas no archivadas) con las cifras correctas.
- AC2: una tarjeta muestra su **deuda**, o "Saldo a favor" si el saldo es positivo; no pide ni muestra fechas, límite ni cuotas.
- AC3: **Compras con tarjeta este mes** suma solo los gastos de cuentas tarjeta del mes actual en Lima, sin ajustes de saldo ni pagos de tarjeta, y muestra la diferencia frente al mes anterior.
- AC4: la deuda de una tarjeta se escribe en positivo al crear, editar y calibrar; internamente es el saldo negativo, y editar la vuelve a mostrar en positivo.
- AC5: **Pagar tarjeta** abre la transferencia con la tarjeta como destino fijo, el monto sugerido igual a la deuda (editable) y solo cuentas líquidas activas como origen; al guardar, baja el saldo de la cuenta y la deuda disminuye en el monto pagado, sin contar como ingreso ni gasto.
- AC6: una tarjeta archivada no ofrece "Pagar" ni "Calibrar saldo"; las cuentas líquidas no ofrecen "Pagar tarjeta".
- AC7: calibrar una tarjeta pide **Deuda real**, muestra la vista previa en términos de deuda y deja la deuda exactamente en el valor escrito.
- AC8: un usuario nunca ve ni modifica tarjetas, deudas ni pagos de otro; las cifras nunca incluyen datos ajenos.
- AC9: no hay migración ni cambios en el esquema.
- AC10: todo error llega como `ActionResult` con mensaje seguro; la lógica está en hooks y funciones puras; no se pasan funciones ni componentes de servidor a cliente.
- AC11: responsive (360, 768 y 1280 px, sin scroll horizontal; textos largos recortados con `min-w-0`), en claro y oscuro con solo tokens, y los formularios como bottom sheet en móvil.
- AC12: `npm run lint`, `npm run test` y `npm run build` pasan.
- AC13 (manual, con sesión): crear una tarjeta, registrar una compra, pagarla y calibrarla funciona en el navegador.

## Tests requeridos

(Vitest; servicio con PGlite y las migraciones reales)

- `account-kind.test.ts`: clasificación de los cuatro tipos.
- `card-summary.test.ts`: deuda con saldos negativos, cero y positivos; totales líquido y de deuda excluyendo archivadas y mezclando tipos.
- `accounts.service.test.ts` (ampliado): `cardSpending` suma solo gastos de tarjetas dentro del rango, excluye ajustes, ingresos, transferencias (pagos) y cuentas no tarjeta, respeta los límites inclusivos del rango y no cuenta datos de otro usuario.
- `account.schema.test.ts` y `use-account-form.test.tsx` (ampliados): tarjeta envía la deuda positiva como saldo negativo, la edición la muestra positiva, y las cuentas de otros tipos no cambian.
- `use-transfer-form.test.tsx` (ampliado): pago con destino fijo, monto sugerido igual a la deuda, origen solo líquido, sin sugerencia cuando no hay deuda.
- `use-calibration-form.test.tsx` (ampliado): tarjeta pide deuda en positivo, invierte el signo y la vista previa habla de deuda.
- `use-quick-add.test.tsx` y `quick-add.test.tsx` (ampliados): `pay-card` abre la transferencia con la tarjeta.
- Componentes presentacionales: sin test unitario; se verifican en el navegador.

## Orden de implementación

1. `account-kind` y `card-summary` con tests; `cardSpending` con su test.
2. Deuda en positivo en el formulario de cuenta y en la calibración.
3. Pagar tarjeta: `pay-card`, valores iniciales y origen líquido.
4. Interfaz de `/accounts`: secciones, cifras y tarjeta.
5. Lint, tests, build y verificación en el navegador.

## Preguntas abiertas

1. **Atajo "Pagar tarjeta".** Se incluye porque evita buscar la cuenta de destino. Si prefieres hacerlo con la transferencia normal, se quita.
2. **Compras con tarjeta del mes frente al mes anterior.** Es la cifra que muestra si dependes menos de la tarjeta; se deduce sola de los gastos de tus cuentas tarjeta. ¿La mantengo en `/accounts` o prefieres verla solo en el futuro dashboard?
3. **Dinero disponible (spec 009a).** Se propone restar la **deuda total de tarjetas** como obligación, sin fechas. Se decide en esa spec.
4. **Intereses y comisiones.** No se añade una categoría por defecto: si quieres registrarlos, creas la categoría en Categorías.
5. **Revisión.** La spec mueve dinero y toca la calibración: se propone pasar el `reviewer` al terminar, con tu OK. No hay migración que aplicar en Neon.

## Próximas fases

- 009a: dinero disponible, que restará la deuda de tarjetas. La spec 007a-2 (cuotas y vencimientos) queda pospuesta y solo se retomará si la necesitas.
