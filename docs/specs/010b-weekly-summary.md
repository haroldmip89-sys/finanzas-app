# Resumen financiero semanal

Estado: hecha (aprobada por delegación del usuario para continuar sin supervisión)

## Objetivo

Una revisión corta de la semana, sin notificaciones ni tono culpabilizador (`docs/BRIEF.md §5.7`): cuánto gastaste, cómo se compara con la semana anterior, dónde se fue, cuántas compras evitaste y cómo cambió tu dinero disponible.

## Decisiones

1. **Semana** = lunes a domingo en America/Lima. Se muestra "esta semana hasta hoy" y se compara con la semana anterior **hasta el mismo día** (como el mes en Inicio).
2. **Gasto** = gastos de categorías que no son de sistema (los ajustes de saldo y los pagos de tarjeta, que son transferencias, no cuentan), igual que en Inicio.
3. **Evolución del dinero disponible** = disponible al inicio de la semana frente a ahora. Se calcula con los saldos de hoy menos lo que se movió desde el lunes en cada cuenta, y la misma función `computeAvailableMoney` (009a). Es una estimación, como todo el disponible.
4. **Compras evitadas** de la semana: solo las evitadas (no las pospuestas), con su valor estimado y la aclaración de que no es dinero ahorrado (010a).
5. **Dónde se ve:** vista `/weekly` y una tarjeta compacta en Inicio con el gasto de la semana y el enlace "Ver resumen". También en Ajustes. Sin cambios en la barra inferior.

## Alcance

- Incluye: módulo `src/modules/weekly-summary` (matemática de semanas, servicio, acción, hook, componentes), vista `/weekly`, tarjeta en Inicio, ítem en Ajustes.
- No incluye: migración (todo se deriva de datos existentes), semanas pasadas navegables, notificaciones, correo, gráficos.

## Reglas

- Fechas como día de Lima (`YYYY-MM-DD`); dinero en céntimos enteros.
- Todo filtra por `userId` de Clerk.
- Disponible al inicio de semana = disponible calculado con saldo de cada cuenta menos su movimiento neto con fecha desde el lunes (ingresos − gastos + transferencias recibidas − enviadas), incluidos movimientos con fecha futura.
- Textos neutros ("Gastaste S/ X menos que a esta altura de la semana pasada").

## Archivos

- `src/modules/weekly-summary/`: `week-math.ts` (+ test), `types/`, `services/` (+ test con PGlite), `actions/`, `hooks/`, `components/`.
- `src/app/(app)/weekly/` (page, loading, error), `src/modules/dashboard/components/dashboard-page.tsx`, `src/modules/settings/settings-items.ts`.

## Criterios de aceptación

- AC1: la semana va de lunes a domingo en Lima; el domingo a las 23:00 aún es la misma semana.
- AC2: el gasto de la semana y el de la anterior hasta el mismo día excluyen ajustes y transferencias.
- AC3: el disponible al inicio de la semana coincide con restar a los saldos actuales lo movido desde el lunes.
- AC4: las compras evitadas de la semana no incluyen las pospuestas.
- AC5: estados de carga, vacío y error con reintento; sin scroll horizontal a 360 px.
- AC6: `npm run lint`, `npm run test` y `npm run build` pasan.

## Tests

- `weekRanges`: lunes, domingo, cruce de mes y de año, hora de Lima frente a UTC.
- Servicio con PGlite: gasto y comparación, exclusión de ajustes, categorías, evitadas, disponible al inicio (con ingresos, gastos y transferencias), aislamiento por `userId`.
- Componentes: tarjeta y vista.

## Notas de implementación

- Sin migración: todo se deriva de transacciones, transferencias, cuentas y compras evitadas.
- Disponible al inicio de semana: saldos de hoy menos el movimiento neto por cuenta desde el lunes, con las tres consultas tipadas de `movementSince`.
- La clave de la consulta cuelga de `accountsKey`, que ya invalidan transacciones, transferencias y calibraciones.
- Verificado: lint, tests y build pasan.
