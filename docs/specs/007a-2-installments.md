# Compras en cuotas (versión ligera)

Estado: hecha (aprobada por delegación del usuario para continuar sin supervisión)

## Objetivo

Llevar el control de las **compras en cuotas** de la tarjeta: cuánto falta pagar, cuánto vence este mes y cuánto interés se está pagando. Es la spec pospuesta 007a-2 (`docs/BRIEF.md §5.5`), construida en su versión **más pequeña y aislada**, porque el producto decidió no pedir fechas ni cuotas por defecto: es opcional y no cambia ninguna cifra que ya existe.

## Decisiones

1. **No cambia el dinero disponible ni los saldos** (decisión 3 del BRIEF). El plan es un recordatorio; la compra en sí se registra como siempre, como gasto de la tarjeta. La pantalla lo dice.
2. **Sin fechas de cierre ni de pago:** cada plan tiene un **primer mes de vencimiento**; cada cuota vence en un mes siguiente (una por mes).
3. **Avance manual:** el usuario marca "Pagué una cuota" (+1). No se deduce de las transferencias de pago para no adivinar.
4. **Interés** = cuotas totales (`cuotas × importe de cuota`) − precio de la compra, si es mayor que 0; si no, "sin intereses". No hay cálculo de TEA ni de pago mínimo.
5. **Devoluciones** quedan fuera de alcance (se manejan con un ingreso o una calibración, como hoy).
6. Se ve en `/installments`, enlazada desde Ajustes. No hay tarjeta en Inicio.

## Alcance

- Incluye: tabla `installment_plans` (migración 0006), módulo `src/modules/installments` (matemática pura, schema, servicio, acciones, hooks, componentes), vista `/installments`, ítem en Ajustes.
- No incluye: efecto en saldos o disponible, límite de crédito, días de cierre/pago, pago mínimo, intereses calculados por tasa, devoluciones, notificaciones.

## Reglas

- Un plan: tarjeta activa del usuario (cuenta de tipo `card`), nombre (1 a 80 caracteres), precio de la compra (> 0), número de cuotas (2 a 60), importe de cuota (> 0) y primer mes de vencimiento (`YYYY-MM`).
- Cuotas pagadas entre 0 y el total; "Pagué una cuota" suma 1 de forma atómica y no pasa del total.
- Próximo vencimiento = primer mes + cuotas pagadas (en meses). Vence **este mes** si ese mes es el actual o anterior (cuota atrasada) y quedan cuotas.
- Falta por pagar = cuotas restantes × importe de cuota. Total del mes = suma de importes de planes que vencen este mes.
- Todo filtra por `userId` de Clerk; Zod en el servidor; dinero en céntimos enteros.

## Archivos

- `src/db/schema/installment-plans.table.ts`, `index.ts`, `drizzle/0006_*.sql`.
- `src/modules/installments/`: `installments-math.ts` (+ test), `schemas/` (+ test), `types/`, `services/` (+ test), `actions/`, `hooks/`, `components/`.
- `src/app/(app)/installments/` (page, loading, error), `src/modules/settings/settings-items.ts`.

## Criterios de aceptación

- AC1: crear un plan en una tarjeta propia y activa; una cuenta que no es tarjeta, ajena o archivada se rechaza.
- AC2: el plan muestra "3 de 12", lo que falta por pagar y el interés (o "sin intereses").
- AC3: "Pagué una cuota" suma 1, no pasa del total y solo funciona con planes propios.
- AC4: el total "vence este mes" incluye cuotas atrasadas y excluye planes terminados o que empiezan más adelante.
- AC5: no cambia saldos, dinero disponible ni presupuestos.
- AC6: carga, vacío y error con reintento; sin scroll horizontal a 360 px.
- AC7: `npm run lint`, `npm run test` y `npm run build` pasan.

## Tests

- Matemática: próximo vencimiento, atraso, terminado, interés, falta por pagar.
- Schema Zod y servicio con PGlite: validaciones de tarjeta, pago atómico, aislamiento por usuario.
- Componente: lista, vacío y acciones.

## Notas de implementación

- Migración `drizzle/0006_gigantic_starfox.sql` (tabla `installment_plans`, aditiva). **Hay que aplicarla a Neon**: sin ella solo falla la vista `/installments`; el resto de la app no depende de esta tabla.
- Aislada a propósito: ninguna otra pantalla ni cálculo lee `installment_plans`.
- Verificado: lint, 689 tests y build pasan.
