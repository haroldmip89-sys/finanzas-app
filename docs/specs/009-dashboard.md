# Dashboard (Inicio)

Estado: hecha (falta tu revisión con sesión)

## Objetivo

Convertir **Inicio** en un panel que responda rápido: cuánto puedo gastar, cuánto he gastado, si me paso de mis límites y qué hice últimamente (BRIEF §5.6). Se construye sobre el sistema visual (spec 012) y sobre el dinero disponible (spec 009a), y solo muestra lo que ya existe en los datos: no inventa secciones. Sin cambios de base de datos.

Referencias: `docs/BRIEF.md §5.6`, diseño "Inicio" móvil (360 px) y escritorio (1280 px), specs 004, 007, 007a-1, 008, 009a y 012.

## Orden de las secciones (como en el diseño)

1. **Dinero disponible** (tarjeta de la spec 009a) y las **acciones rápidas** (ya existen).
2. **Gastos del mes:** total del mes, comparación con la misma altura del mes anterior y reparto por categoría.
3. **Deuda de tarjetas:** total y número de tarjetas con deuda (solo si el usuario tiene tarjetas).
4. **Presupuesto restante:** lo que queda del total presupuestado, barra y estado en texto (Holgado, Cerca del límite, Excedido). Enlaza a Presupuestos. Si no hay presupuestos, una invitación a crear el primero.
5. **Últimos movimientos:** los 5 más recientes (con badge "Ajuste" cuando corresponde) y enlace "Ver todos" a Movimientos.

En escritorio las secciones se reparten en columnas como en el diseño; en móvil van una debajo de otra.

## Decisiones (con mi recomendación)

1. **Fuera de esta spec (no hay datos todavía):** "Próximas obligaciones", "Comportamiento de consumo" y "Compras evitadas". Se diseñan ya; cada una necesita su propia spec (P1). No se muestran tarjetas vacías ni de relleno.
2. **Comparación del mes:** gasto del mes en curso hasta hoy frente al gasto del mes anterior hasta el mismo día (si el mes anterior es más corto, hasta su último día). Texto neutro ("S/ 153.60 menos que a esta altura de octubre"), sin culpa.
3. **Reparto por categoría:** las 4 categorías con más gasto y el resto agrupado como "Otros"; barra apilada + leyenda con importe en texto (los gráficos no dependen solo del color). Los ajustes de saldo y las transferencias no cuentan.
4. **Un solo origen de datos:** una acción `getDashboardAction` que reúne todo con un único `userId`, y un hook con TanStack Query; las mutaciones existentes (transacciones, transferencias, cuentas, calibración, presupuestos) invalidan su clave.
5. **Presupuestos:** se reutiliza el servicio de la spec 008 (totales del mes en curso); la tarjeta "Presupuestos" que hoy lleva a `/analysis` pasa a ser esta sección.

## Alcance

- Incluye:
  - Servicio `getDashboard(userId)` que compone: dinero disponible (009a), gasto del mes y del mes anterior hasta la misma altura, reparto por categoría, deuda de tarjetas (reutiliza `sumCardDebt`), totales de presupuestos del mes y últimos 5 movimientos.
  - Acción, hook y componentes de las cinco secciones con sus estados de carga (esqueletos con la misma geometría), vacío y error con "Reintentar".
  - Composición de la página Inicio (móvil y escritorio) y retirada de la tarjeta provisional de Presupuestos.
- No incluye:
  - Obligaciones, consumo por día de la semana, compras evitadas, resumen semanal ni reportes.
  - Librerías de gráficos (la barra apilada y la leyenda son HTML/CSS).
  - Cambios en datos, migraciones o reglas de negocio de otros módulos.

## Reglas

- Montos en céntimos y `formatPen`; fechas `YYYY-MM-DD` en America/Lima (`src/lib/dates.ts`).
- Gastos = transacciones de tipo gasto del mes, **sin** ajustes de saldo y **sin** transferencias.
- Los pagos de tarjeta son transferencias, no gastos: no se cuentan dos veces.
- Todo filtra por `userId` de Clerk; validación con Zod en la acción.
- Colores solo con tokens semánticos (`chart-1…5`, `success`, `warning`, `expense`, `debt`); estado siempre también en texto.

## Archivos (previstos)

- `src/modules/dashboard/` (nuevo): `services/dashboard.service.ts`, `dashboard-math.ts` (comparación y agrupación en "Otros", funciones puras), `actions/`, `hooks/use-dashboard.ts`, `components/` (`spending-summary`, `debt-summary`, `budget-summary`, `recent-movements`, `dashboard-page`).
- `src/lib/query-keys.ts` y las mutaciones existentes (invalidación).
- `src/app/(app)/dashboard/page.tsx`.

## Criterios de aceptación

- AC1: el gasto del mes suma solo gastos del mes (sin ajustes ni transferencias) y la comparación usa la misma altura del mes anterior.
- AC2: el reparto muestra las 4 categorías principales y "Otros"; la suma de los tramos es igual al total.
- AC3: la sección de deuda aparece solo si hay tarjetas; el presupuesto restante coincide con los totales de Presupuestos del mes.
- AC4: sin presupuestos se invita a crear el primero; sin movimientos se muestra un vacío con acción "Nuevo gasto".
- AC5: los últimos movimientos son los 5 más recientes y "Ver todos" lleva a Movimientos.
- AC6: registrar un gasto o una transferencia actualiza el panel sin recargar.
- AC7: carga con esqueletos, error con "Reintentar" y sin scroll horizontal a 360, 768 y 1280 px, en claro y oscuro.
- AC8: los gráficos tienen `role="img"` con descripción y leyenda con importes en texto.
- AC9: `npm run lint`, `npm run test` y `npm run build` pasan; los tests existentes no cambian.

## Tests requeridos

- Unitarios de `dashboard-math`: comparación (mes anterior más corto, día 31, mes sin gasto previo), agrupación en "Otros" (menos de 5 categorías, empates, total exacto).
- Servicio con PGlite y migraciones reales: aislamiento por `userId`, exclusión de ajustes y transferencias, últimos 5 movimientos, usuario sin datos.
- Hook y componentes: cada sección en estado normal, vacío y error; esqueletos; invalidación tras una mutación.
- Prueba en vivo en Neon con usuario temporal (datos borrados después) y verificación visual en navegador con página temporal.

## Orden de implementación

1. Funciones puras y sus tests.
2. Servicio y acción (con prueba en vivo).
3. Hook y componentes de cada sección.
4. Página Inicio (móvil y escritorio), invalidaciones, estados.
5. Lint, tests, build y verificación visual.

## Dependencias

Requiere la spec 009a (tarjeta de dinero disponible). Si prefieres, se aprueban y se implementan una tras otra en este orden.

## Próximas fases

- Obligaciones, compras evitadas y comportamiento de consumo (P1), que se añadirán al panel con sus propias specs.
- 010: endurecimiento y despliegue.

## Notas de implementación

- En vez de una acción `getDashboardAction` única, cada sección usa su hook (cuentas, presupuestos, transacciones) y solo el resumen de gastos tiene servicio y acción nuevos (`spendingSummaryAction`, bajo la clave `transactions`). Así se reutiliza todo lo existente, cada sección carga y falla por separado, y la invalidación sale gratis.
- El botón "+" ahora también aparece en `/dashboard` (pedido del usuario); el test del FAB se actualizó.
