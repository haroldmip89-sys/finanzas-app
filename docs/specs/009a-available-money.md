# Dinero disponible

Estado: hecha

## Objetivo

Calcular y explicar **cuánto dinero puedes gastar de verdad**, que es el indicador principal de la app (BRIEF §5.1). Es una estimación sencilla, siempre marcada como "Estimado", sin fechas de vencimiento ni cuotas:

> Dinero disponible = dinero líquido incluido − deuda total de tarjetas

Las **reservas** se resuelven con un interruptor por cuenta ("Incluir en dinero disponible"): una cuenta que apartas (por ejemplo, emergencias) se desactiva y su saldo deja de contar. Esta spec construye el cálculo, el interruptor y la tarjeta que lo muestra; el dashboard completo es la spec 009.

Referencias: `docs/BRIEF.md §5.1, §11 (decisiones 3 y 4)`, diseño "Inicio" (tarjeta "Dinero disponible" y "¿Cómo se calculó?"), specs 003 y 007a-1.

## Decisiones (con mi recomendación)

1. **Sin obligaciones:** se resta solo la deuda de tarjetas (decisión 3 del BRIEF). "Próximas obligaciones" del diseño queda para otra spec.
2. **Período de planificación:** hasta el **último día del mes en curso**, sin configuración (decisión 4 del BRIEF; simple y suficiente). Muestra "para gastar hasta el 30 de noviembre · ≈ S/ X por día", contando hoy.
3. **Cuentas excluidas:** solo se pueden excluir cuentas líquidas; las tarjetas siempre restan su deuda. Una cuenta archivada nunca cuenta (como hoy).
4. **Disponible negativo:** se muestra con signo y un texto tranquilo ("Tu deuda de tarjetas supera tu dinero líquido"), sin alarma y sin "por día".
5. **Estimado siempre:** la etiqueta "Estimado" (borde punteado, ícono y texto, color `info`) acompaña siempre a la cifra.

## Alcance

- Incluye:
  - Columna `include_in_available` (boolean, por defecto `true`) en `accounts`, con **migración 0003**.
  - Interruptor "Incluir en dinero disponible" en el formulario de cuenta (solo cuentas líquidas), con texto de ayuda ("Desactívalo para apartar este dinero: no se cuenta como disponible").
  - Función pura `computeAvailableMoney` que devuelve: líquido total, reservado (cuentas excluidas), deuda de tarjetas, disponible, días restantes del mes y disponible por día.
  - Servicio y acción `getAvailableMoneyAction` (con `userId` de Clerk).
  - Componente `AvailableMoneyCard`: cifra héroe, etiqueta "Estimado", texto del período y desplegable "¿Cómo se calculó?" con el desglose (saldo en cuentas, − reservas, − deuda de tarjetas, = disponible).
  - La tarjeta se muestra en Inicio, encima de las acciones rápidas (el resto de Inicio es la spec 009).
  - Invalidación: crear, editar o borrar transacciones, transferencias, calibraciones y cuentas refresca la cifra.
- No incluye:
  - Obligaciones, vencimientos, cuotas, fecha de próximo ingreso ni período configurable.
  - Reservas con monto fijo o metas de ahorro (solo el interruptor por cuenta).
  - El dashboard completo, compras evitadas ni análisis (spec 009 y siguientes).

## Reglas

- Dinero en céntimos enteros; formato con `formatPen`.
- Líquido incluido = suma de saldos de cuentas líquidas, no archivadas y con `include_in_available = true`.
- Reservado = suma de saldos de cuentas líquidas, no archivadas y excluidas (se muestra en el desglose si es > 0).
- Deuda de tarjetas = `sumCardDebt` (una tarjeta con saldo a favor no compensa a otra).
- Los ajustes de saldo, al ser transacciones, ya están en los saldos: no se descuentan dos veces.
- Días restantes = días desde hoy hasta fin de mes, ambos incluidos, en America/Lima.
- Por día = disponible ÷ días restantes, redondeado hacia abajo a céntimos; solo si el disponible es > 0.
- `userId` solo de Clerk; validación con Zod en la acción; el servicio filtra siempre por `userId`.

## Archivos (previstos)

- `src/db/schema/accounts.table.ts` + `drizzle/0003_*.sql` (migración generada con drizzle-kit; se aplica a Neon **solo con tu OK**).
- `src/modules/accounts/` (schema Zod, tipos, servicio y formulario de cuenta con el interruptor).
- `src/modules/available-money/` (nuevo): `available-money.ts` (función pura), `services/`, `actions/`, `hooks/use-available-money.ts`, `components/available-money-card.tsx`.
- `src/lib/query-keys.ts` (clave compartida) y las mutaciones existentes (invalidación).
- `src/app/(app)/dashboard/page.tsx` (monta la tarjeta).

## Criterios de aceptación

- AC1: con una cuenta de S/ 1,000, otra excluida de S/ 500 y una tarjeta con deuda de S/ 200, el disponible es S/ 800 y el desglose muestra S/ 1,500 en cuentas, S/ 500 reservados y S/ 200 de deuda.
- AC2: una tarjeta con saldo a favor no suma ni compensa deuda de otra.
- AC3: una cuenta archivada no cuenta, esté incluida o no.
- AC4: disponible negativo se muestra con signo, texto calmado y sin cifra por día.
- AC5: la etiqueta "Estimado" aparece siempre junto a la cifra, con texto (no solo color).
- AC6: el interruptor solo aparece en cuentas líquidas; al cambiarlo la cifra se actualiza.
- AC7: registrar un gasto o una transferencia a una reserva actualiza la cifra sin recargar.
- AC8: el desplegable "¿Cómo se calculó?" es accesible (botón con `aria-expanded`) y respeta movimiento reducido.
- AC9: la tarjeta se ve bien a 360, 768 y 1280 px, en claro y oscuro, sin scroll horizontal.
- AC10: `npm run lint`, `npm run test` y `npm run build` pasan; el resto de pruebas existentes no cambia.

## Tests requeridos

- Unitarios de `computeAvailableMoney`: caso base, reservas, tarjetas con deuda y con saldo a favor, archivadas, negativo, último día del mes, mes de 28/29/30/31 días.
- Servicio con PGlite y migraciones reales: aislamiento por `userId`, cuentas excluidas y archivadas, ajustes de saldo.
- Servicio de cuentas: guardar y editar `include_in_available`; las tarjetas lo ignoran.
- Hooks y componente: cifra, "Estimado", desglose, estado negativo, carga y error con reintento.
- Prueba en vivo en Neon con usuario temporal (datos borrados después), tras aplicar la migración.

## Orden de implementación

1. Función pura y sus tests.
2. Migración 0003 y cambios del servicio de cuentas (pido tu OK antes de aplicarla a Neon).
3. Servicio y acción de dinero disponible.
4. Hook, tarjeta e interruptor del formulario.
5. Montaje en Inicio, invalidaciones y verificación (lint, tests, build, prueba en vivo y navegador).

## Próximas fases

- 009: dashboard completo (gastos del mes, deuda, presupuesto, últimos movimientos).
- Obligaciones y fecha de próximo ingreso, si algún día hacen falta.

## Notas de implementación

- Sin servicio ni acción propios: `AvailableMoneyCard` usa `useAccounts` y la función pura `computeAvailableMoney` (KISS). Se refresca sola con la clave `accounts`, que ya invalidan transacciones, transferencias y calibraciones.
- El formulario de cuenta ganó el campo `includeInAvailable` (solo cuentas líquidas). El servicio fuerza `true` en tarjetas y conserva el valor si una actualización no lo menciona.
- Migración `drizzle/0003_wild_adam_warlock.sql` (aditiva, `DEFAULT true`). **Hay que aplicarla a Neon antes de usar la app contra esa base**: sin la columna, el listado de cuentas falla.
- Tests existentes de cuentas: los fixtures y los payloads esperados ganaron `includeInAvailable`.
