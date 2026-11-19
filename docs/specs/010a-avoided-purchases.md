# Compras impulsivas evitadas

Estado: hecha (falta aplicar la migración 0004 a Neon y la prueba en vivo)

## Objetivo

Registrar una compra que decidiste **no hacer o posponer**, y ver cuánto llevas evitado, para reforzar el objetivo de los primeros meses: reducir el gasto impulsivo (BRIEF §5.2). Es un registro **fuera de las finanzas**: no crea transacciones, no cambia saldos, ni el dinero disponible, ni los presupuestos. El importe es lo que *habrías* gastado, nunca dinero ahorrado real, y así se dice siempre en pantalla.

Referencias: `docs/BRIEF.md §5.2, §9`, diseño "Inicio" (tarjeta "compras evitadas"), specs 008 (presupuestos) y 009 (Inicio), spec 010c (compra consciente, posterior).

## Decisiones (con mi recomendación)

1. **Datos del registro:** importe estimado (obligatorio), fecha (hoy por defecto, no futura), categoría de gasto **opcional**, motivo **opcional** (no necesario, fuera de presupuesto, puedo esperar, otro), nota **opcional** de hasta 120 caracteres ("¿qué era?") y estado.
2. **Estados:** `evitada` (definitiva) o `pospuesta`. Solo las evitadas suman en los totales; las pospuestas se muestran aparte ("N pospuestas · S/ X") porque todavía pueden terminar en compra. Una pospuesta se puede pasar a evitada. Si al final la compras, se **elimina el registro** y se registra el gasto normal (no hay un tercer estado).
3. **Dónde se ve:**
   - Tarjeta **"Compras evitadas"** en Inicio (número, importe, comparación con el mes anterior a la misma altura y enlace).
   - Página propia **`/avoided`** ("Compras evitadas"), con selector de mes, resumen, categorías donde más se evita y el historial. Se llega desde esa tarjeta y desde Ajustes.
   - **No** se añade al menú del botón "+" por ahora (es el flujo de dinero real); se revisa en la 010c.
4. **Sin cambios en el dinero:** ni transacciones, ni saldos, ni dinero disponible, ni presupuestos. Texto fijo: "Es lo que habrías gastado, no dinero ahorrado".
5. **Categorías:** solo de gasto, propias, no archivadas y no de sistema (como en presupuestos). Si una categoría se archiva después, el registro la conserva.
6. **Tono:** sin culpa ni confeti; mensajes neutros ("3 compras evitadas este mes").

## Alcance

- Incluye:
  - Tabla `avoided_purchases` y **migración 0004** (aditiva): `id`, `user_id`, `amount_cents` (> 0), `date`, `category_id` (nulo), `category_kind` constante `expense` para la clave compuesta de propiedad, `reason` (enum nulo), `note` (nulo), `status` (enum `avoided` | `postponed`), marcas de tiempo.
  - Reglas en la base: propiedad y tipo de categoría por clave compuesta, importe positivo, nota de hasta 120 caracteres.
  - Servicio con validación (Zod en la acción + reglas en el servicio): crear, editar, cambiar estado, eliminar y listar un mes con totales, categorías y comparación.
  - Acciones, hooks y componentes: tarjeta de Inicio, página `/avoided`, formulario en hoja inferior (diálogo desde 640 px) con segmentado Evitada | Pospuesta.
  - Clave de consulta compartida para refrescar Inicio y la página al guardar.
  - Enlace en Ajustes y título/SEO de la nueva página.
- No incluye:
  - Pausa de reflexión ni detección de compras (spec 010c).
  - Recordatorios, notificaciones, metas de ahorro ni cálculo de "dinero ahorrado".
  - Cambios en saldos, transacciones, presupuestos o dinero disponible.

## Reglas

- Importe en céntimos enteros (`penToCents`), formato `formatPen`; fecha `YYYY-MM-DD` en America/Lima, no futura.
- Totales del mes: suma de las **evitadas** de ese mes; comparación con el mes anterior hasta el mismo día (`comparableRanges`); categorías agrupadas, con "Sin categoría" para las que no la tienen.
- `userId` solo de Clerk; validación en la acción; el servicio filtra siempre por `userId` y falla con `NOT_FOUND` ante ids de otro usuario.
- La acción nueva entra en el test de protección de acciones (spec 010) automáticamente.
- Colores con tokens (`success` para el recuadro de logro, `info` para el aviso de estimado); estado también en texto.

## Archivos (previstos)

- `src/db/schema/avoided-purchases.table.ts` + `enums.ts` + `index.ts`; `drizzle/0004_*.sql` (se aplica a Neon **solo con tu OK**).
- `src/modules/avoided-purchases/` (nuevo): `schemas/`, `types/`, `services/avoided-purchases.service.ts`, `actions/`, `hooks/`, `components/` (`avoided-summary-card`, `avoided-page`, `avoided-form-dialog`, `avoided-row`), `avoided-math.ts`.
- `src/app/(app)/avoided/{page,loading,error}.tsx`, `src/lib/query-keys.ts`.
- `src/modules/dashboard/components/dashboard-page.tsx` (monta la tarjeta), `src/modules/settings/settings-items.ts` (enlace).
- `docs/BRIEF.md` (estado).

## Criterios de aceptación

- AC1: se puede registrar una compra evitada con solo el importe; categoría, motivo y nota son opcionales.
- AC2: no se aceptan importes ≤ 0, fechas futuras ni categorías de ingreso, de sistema, archivadas o de otro usuario.
- AC3: registrar, editar o eliminar una compra evitada **no cambia** ningún saldo, transacción, presupuesto ni el dinero disponible.
- AC4: los totales cuentan solo las evitadas; las pospuestas aparecen aparte y pasar una a evitada actualiza los totales.
- AC5: la tarjeta de Inicio muestra número, importe y comparación con el mes anterior a la misma altura, y el texto "no es dinero ahorrado".
- AC6: `/avoided` permite cambiar de mes, ver las categorías donde más se evita y el historial, y editar, cambiar estado o eliminar con confirmación.
- AC7: se ve bien a 360, 768 y 1280 px, en claro y oscuro, con estados de carga, vacío y error con "Reintentar".
- AC8: ningún usuario ve ni modifica registros de otro.
- AC9: `npm run lint`, `npm run test` y `npm run build` pasan; los tests existentes no cambian de comportamiento.

## Tests requeridos

- Unitarios de `avoided-math`: totales por estado, comparación a la misma altura (mes anterior más corto), agrupación por categoría con "Sin categoría".
- Esquemas Zod: importe, fecha futura, nota larga, motivo y estado inválidos.
- Servicio con PGlite y migraciones reales: crear con y sin categoría, categoría inválida (ingreso, sistema, archivada, ajena), editar, cambiar estado, eliminar, totales, aislamiento por `userId`, y que **no se creen transacciones**.
- Restricciones de base (`constraints.test.ts`): importe positivo, clave compuesta de categoría, enums.
- Hooks y componentes: tarjeta (con datos, vacío, error), formulario (campos opcionales, validación, errores del servidor), página (mes, historial, acciones).
- Prueba en vivo en Neon con usuario temporal (datos borrados después), tras aplicar la migración.

## Orden de implementación

1. Esquema, migración 0004 y restricciones (con sus tests); pido tu OK antes de aplicarla a Neon.
2. Funciones puras y servicio con tests.
3. Acciones y hooks.
4. Formulario, página `/avoided` y enlace en Ajustes.
5. Tarjeta de Inicio.
6. Lint, tests, build, prueba en vivo y verificación visual.

## Preguntas abiertas

1. **¿Nota obligatoria?** Propongo opcional para no meter fricción al registrar. 
2. **¿Entrada en el menú "+"?** Propongo dejarla para la 010c.
3. **Revisión:** la spec no toca dinero ni autenticación; propongo no usar el agente `reviewer`.

## Próximas fases

- 010c: compra consciente (pausa antes de registrar un gasto), que podrá terminar en una compra evitada o pospuesta.
- 010b: resumen semanal, que incluirá las compras evitadas.

## Notas de implementación

- Tabla `avoided_purchases` y migración `drizzle/0004_cultured_whistler.sql` (enums `avoided_reason` y `avoided_status`). **Pendiente de aplicar a Neon**; hasta entonces la página y la tarjeta de Inicio fallan al cargar. Los tests de migraciones y restricciones ya cubren la tabla.
- Servicio puro de dinero: no importa ni toca `transactions`, saldos, presupuestos ni dinero disponible (hay un test que lo comprueba).
- La fecha futura se rechaza en el servicio con la fecha de Lima. Una categoría archivada se conserva solo si el registro ya la usaba.
- Los mensajes de la nota ("Mes anterior a la misma altura", "no suman arriba") y el texto "Es lo que habrías gastado, no dinero ahorrado." aparecen en la tarjeta, la página y el formulario.
- Se reutiliza `MonthSwitcher` de presupuestos, `ResourceCard`, `EntitySelect` y `DashboardSection`.
- Cambios laterales: el mensaje de error al borrar una categoría en uso ahora menciona las compras evitadas; "Compras evitadas" en Ajustes (y resalta Ajustes en `/avoided`); `/avoided` en `robots.txt`; la tarjeta del Inicio va después de "Evolución del gasto".
- Verificado en navegador con página temporal (borrada) a 360 px en oscuro. Se detectó y corrigió que el marcador "Pospuesta" apretaba el título; ahora va en el subtítulo.
