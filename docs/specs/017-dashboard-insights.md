# Dashboard: presupuestos en el dinero disponible y evolución del gasto

Estado: hecha (falta tu revisión con sesión)

## Objetivo

Corregir dos cosas del Inicio y añadir una lectura visual:

1. **Dinero disponible con presupuestos:** hoy la tarjeta muestra "≈ S/ X por día" como si todo el saldo estuviera libre, aunque parte ya esté destinada a presupuestos. Con presupuestos en el mes se mostrará cuánto queda **sin asignar** y se ocultará la cifra por día.
2. **Selección accidental de texto** al deslizar en móvil sobre las tarjetas del Inicio.
3. **Evolución del gasto:** gráfica del gasto acumulado del mes frente al mes anterior, hasta el mismo día.

Reúne y reemplaza las propuestas `017-dashboard-improvements-proposal.md` y `017-dashboard-spending-insights.md` (escritas por otro agente), verificadas contra el código real. Sin migraciones ni cambios en datos. La retención de datos antiguos **no** se implementa (ver "Pendiente").

Referencias: specs 008, 009a, 009 y 012; `docs/BRIEF.md §5.1, §5.6`.

## Decisiones (acordadas)

1. **Fórmula con presupuestos:** `sin asignar = disponible − Σ max(0, presupuesto − gastado)` sobre los presupuestos del mes actual. Un presupuesto excedido no devuelve dinero. Lo ya gastado salió de los saldos, así que no se descuenta dos veces. Las reservas ya están fuera del disponible (009a).
2. **Con presupuestos:** se muestra "Pendiente en presupuestos" y "Sin asignar"; **no** se muestra cifra por día. Si lo pendiente supera lo disponible: texto calmado, sin alarma.
3. **Sin presupuestos:** se conserva el promedio diario, etiquetado como orientativo.
4. **Gráfica:** líneas de **gasto acumulado** (mes actual sólido, mes anterior punteado), no barras diarias: se leen mejor en 360 px y responden "¿voy gastando más o menos que el mes pasado?". SVG propio, sin librerías nuevas.
5. **Misma definición de gasto** que el resto del Inicio: solo gastos, sin ajustes de saldo (categorías de sistema) ni transferencias.

## Alcance

- Incluye:
  - Función pura `computeBudgetAllocation(availableCents, budgetItems)` → `{ hasBudgets, pendingCents, unassignedCents }`.
  - `AvailableMoneyCard` usa `useBudgets(mes actual)`:
    - con presupuestos: dos líneas "Pendiente en presupuestos" y "Sin asignar" (y filas extra en "¿Cómo se calculó?"); sin cifra por día;
    - sin presupuestos: "Sin presupuestos este mes · promedio diario estimado ≈ S/ X (orientativo)";
    - mientras cargan los presupuestos o si fallan: no se muestra ni la cifra por día ni la de sin asignar (nunca una cifra engañosa).
  - `select-none` en `DashboardSection` y en `AvailableMoneyCard` (no global; botones y enlaces siguen funcionando).
  - Servicio `dailySpending(userId, now)` y acción: gasto por día del mes actual (día 1 a hoy) y del anterior (día 1 al mismo número de día, limitado a su último día), con ceros en los días sin gasto.
  - Función pura de acumulado y de comparación (diferencia, % de variación, promedio diario) en `dashboard-math.ts`.
  - Sección **"Evolución del gasto"** en el Inicio: gráfica SVG, leyenda, resumen (gasto actual, anterior, diferencia, % y promedio diario), control "Consultar día" (deslizador accesible) con el valor de ambos meses ese día, y "Ver datos por día" (tabla).
- No incluye:
  - Borrado o archivado de datos antiguos.
  - Barras diarias, librerías de gráficos, notificaciones.
  - Cambios en saldos, presupuestos o la fórmula base del dinero disponible (009a).

## Reglas

- Montos en céntimos y `formatPen`; fechas `YYYY-MM-DD` en America/Lima; reutilizar `comparableRanges`.
- `% de variación`: `null` (se muestra "—") cuando el periodo anterior es 0.
- Día 1 del mes: un solo punto por serie; si no hay gasto en ninguno de los dos periodos, estado vacío "Aún no registras gastos este mes".
- Mes anterior más corto: la serie anterior termina en su último día y el resumen lo dice.
- Colores con tokens (`primary` y `muted-foreground`/`chart-*`); la gráfica tiene `role="img"` con descripción en texto y la tabla como alternativa; funciona sin color (línea sólida vs punteada).
- `userId` solo de Clerk; validación en la acción; el servicio filtra siempre por `userId`.

## Archivos (previstos)

- `src/modules/available-money/` (función de asignación, tarjeta).
- `src/modules/dashboard/` (`dashboard-math.ts`, servicio, acción, hook `use-daily-spending.ts`, componentes `spending-trend-chart.tsx` y resumen, `dashboard-section.tsx`).
- `src/modules/dashboard/components/dashboard-page.tsx` (monta la nueva sección).
- `docs/BRIEF.md` (fila 017 y nota de retención pendiente).

## Criterios de aceptación

- AC1: con presupuestos, la tarjeta muestra "Pendiente en presupuestos" y "Sin asignar" y **no** muestra "por día".
- AC2: sin presupuestos, muestra el promedio diario con el texto de orientación.
- AC3: un presupuesto excedido no aumenta el dinero sin asignar; lo pendiente que supera el disponible se explica con texto calmado.
- AC4: mientras los presupuestos cargan o fallan no aparece cifra por día ni de sin asignar.
- AC5: el texto de las tarjetas del Inicio no se selecciona al deslizar en móvil; botones y enlaces siguen funcionando.
- AC6: la gráfica muestra el acumulado del mes actual y del anterior hasta el mismo día, con leyenda; los días sin gasto no rompen la línea.
- AC7: transferencias y ajustes de saldo no entran en ninguna serie ni total.
- AC8: el resumen da gasto de ambos periodos, diferencia, % (o "—" si el anterior es 0) y promedio diario.
- AC9: "Consultar día" y "Ver datos por día" dan los valores exactos por día, con teclado y lector de pantalla.
- AC10: se ve bien a 360, 768 y 1280 px, en claro y oscuro, sin scroll horizontal; estados de carga, error con "Reintentar" y vacío.
- AC11: `npm run lint`, `npm run test` y `npm run build` pasan; los tests existentes no cambian de comportamiento.

## Tests requeridos

- `computeBudgetAllocation`: sin presupuestos, restante positivo, presupuesto excedido (no suma), pendiente mayor que el disponible, varios presupuestos.
- Matemática de la gráfica: acumulado con días sin gasto, mes anterior más corto, día 1, variación con anterior en 0, promedio diario.
- Servicio con PGlite y migraciones reales: ceros en días sin gasto, exclusión de ajustes y transferencias, aislamiento por `userId`, 31 de marzo contra febrero, zona horaria de Lima.
- Tarjeta: con presupuestos, sin presupuestos, cargando, error de presupuestos, excedido.
- Gráfica y resumen: datos normales, vacío, un solo día, error con reintento, deslizador y tabla.
- Prueba en vivo en Neon con usuario temporal (datos borrados después).

## Orden de implementación

1. Funciones puras y sus tests.
2. Tarjeta de dinero disponible con presupuestos y `select-none`.
3. Servicio, acción y hook de gasto diario (con prueba en vivo).
4. Gráfica, resumen, deslizador y tabla.
5. Montaje en el Inicio, estados, lint, tests, build y verificación visual.

## Pendiente (no implementar)

**Retención o limpieza de datos cada seis meses.** No hacer borrados ni tareas automáticas. Un usuario genera unos pocos KB al mes y el saldo de una cuenta depende de todo su historial (saldo inicial + movimientos), así que borrar rompería los saldos y las comparaciones. Si algún día hace falta: exportar o archivar, y eliminar solo con consentimiento explícito.

## Próximas fases

- 010: endurecimiento y despliegue; 010a, 010c y 010b (P1).

## Notas de implementación

- `computeBudgetAllocation` en `available-money/`; la tarjeta usa `useBudgets(mes actual)` y no muestra cifra por día ni "sin asignar" mientras los presupuestos cargan o fallan.
- `select-none` en `DashboardSection` y en la tarjeta de dinero disponible.
- Servicio `dailySpending` (una consulta, ceros en días sin gasto), acción y hook bajo la clave `transactions` (se refresca al guardar un movimiento).
- Gráfica SVG propia (`TrendChart`): mes actual `chart-1` sólido, mes anterior `muted-foreground` punteado; deslizador "Consultar día" y tabla "Ver datos por día". Verificada con página temporal (borrada) a 360 px en oscuro y claro.
- Los tests de la tarjeta y de la página del dashboard ganaron el mock de presupuestos y de gasto diario.
