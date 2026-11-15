# Compras impulsivas evitadas

Estado: hecha (aprobada por delegación del usuario para continuar sin supervisión)

## Objetivo

Registrar una compra que el usuario decidió **no hacer o posponer**, y mostrar cuántas lleva evitadas, sin inventar ahorros (`docs/BRIEF.md §5.2`). **No crea una transacción financiera**: no cambia saldos, presupuestos ni el dinero disponible. El importe es solo el valor estimado de lo que no se compró.

Esta spec también deja listo el estado **pospuesta**, que usa la compra consciente (010c, "Pensarlo").

## Decisiones

1. Estados: `avoided` (evitada definitivamente) y `postponed` (pospuesta, con una hora sugerida para volver a decidir, opcional). Solo las **evitadas** cuentan en el importe evitado; las pospuestas se muestran aparte ("en espera").
2. Motivos: no la necesito, fuera de presupuesto, puedo esperar, otro. Opcional.
3. Una compra pospuesta se resuelve con dos acciones: **"La dejé"** (pasa a evitada) o **"La compré"** (se elimina el registro; el gasto se registra como siempre desde Nuevo gasto). También se puede eliminar cualquier registro.
4. Sin notificaciones. Las pospuestas se ven en la vista y en la tarjeta de Inicio.
5. Navegación: tarjeta "Compras evitadas" en Inicio (cifras del mes, atajo "Registrar" y enlace "Ver todas") y vista `/avoided` enlazada desde Ajustes. Los destinos de la barra inferior no cambian.

## Alcance

- Incluye: tabla `avoided_purchases` con migración 0004; módulo `src/modules/avoided-purchases` (schema Zod, servicio, acciones, hooks, componentes); vista `/avoided`; tarjeta en Inicio; ítem en Ajustes.
- Cifras: evitadas del mes (número e importe) frente al mes anterior, pospuestas en espera y categorías donde más se evita este mes.
- No incluye: efecto alguno en saldos o disponible, notificaciones, edición de un registro (se elimina y se crea otro), ni el paso de compra consciente (010c).

## Reglas

- Importe entero en céntimos, mayor que 0; fecha como día de Lima (`YYYY-MM-DD`).
- Categoría opcional: si se da, debe ser una categoría de **gasto** del usuario, activa y no de sistema (misma validación que presupuestos).
- Todo filtra por `userId` de Clerk; Zod en el servidor.
- Importe evitado del mes = suma de `avoided` con fecha en el mes. Comparación con el mes anterior completo.
- Tono neutro: nada de "ahorraste". Se dice "Compras evitadas" y "valor estimado", con el aviso de que no es dinero ahorrado real.

## Archivos

- `src/db/schema/avoided-purchases.table.ts`, `enums.ts`, `index.ts`, `drizzle/0004_*.sql`.
- `src/modules/avoided-purchases/`: `schemas/`, `types/`, `services/`, `actions/`, `hooks/`, `components/`.
- `src/app/(app)/avoided/` (page, loading, error), `src/modules/dashboard/components/dashboard-page.tsx`, `src/modules/settings/settings-items.ts`.

## Criterios de aceptación

- AC1: registrar una compra evitada no cambia saldos, presupuestos ni disponible.
- AC2: las evitadas del mes suman número e importe; las pospuestas no suman en el importe y aparecen en espera.
- AC3: "La dejé" pasa una pospuesta a evitada; "La compré" y eliminar borran el registro, solo del propio usuario.
- AC4: una categoría ajena, de ingreso, de sistema o archivada se rechaza.
- AC5: la tarjeta de Inicio y la vista muestran estados de carga, vacío y error con reintento, sin scroll horizontal a 360 px.
- AC6: `npm run lint`, `npm run test` y `npm run build` pasan; las pruebas existentes no cambian.

## Tests

- Schema Zod (importes, fecha, motivo).
- Servicio con PGlite y migraciones reales: crear, validar categoría, resumen del mes, comparación, aislamiento por `userId`, resolver, eliminar.
- Componentes: tarjeta de Inicio y vista (cifras, vacío, acciones).

## Notas de implementación

- Migración `drizzle/0004_high_puppet_master.sql` (aditiva). **Hay que aplicarla a Neon antes de usar la app contra esa base**; no se aplicó a la base real.
- La tarjeta de Inicio usa `DashboardSection` del módulo dashboard; la vista está en `/avoided` y se enlaza desde Ajustes y desde la tarjeta.
- "Pensarlo" de 010c usará `create` con `status: "postponed"` y `revisitAt`.
- Verificado: lint, 617 tests y build pasan.
