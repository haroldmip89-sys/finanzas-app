# Base de datos: Neon, Drizzle y esquema

Estado: hecha

## Objetivo

Crear la capa de datos del MVP: cliente Drizzle sobre Neon, esquema de `accounts`, `categories`, `transactions` y `budgets`, y la primera migración versionada. Las invariantes de propiedad y de tipo se imponen **en la base de datos**, no solo en los servicios. Referencias: `system-design.md §2` (entidades e invariantes), `§3` (propiedad de datos), `§5` (capa de datos).

Decisiones de diseño:

1. **Cliente `neon-serverless` (Pool por WebSocket)**, no `neon-http`, porque habrá operaciones que necesitan transacciones interactivas (ej. sembrar categorías). Corrige `system-design.md §5`, que proponía `neon-http` por defecto.
2. **Tablas en `src/db/schema/*.table.ts`**, un archivo por tabla, como ya indica `system-design.md §4` (`src/db/`). Los servicios siguen viviendo en cada módulo.
3. **Claves foráneas compuestas** para que Postgres garantice las invariantes 1 y 3 de `§2`: una transacción solo puede referenciar cuentas y categorías **del mismo `user_id`**, y su `type` debe coincidir con el `kind` de la categoría. Un presupuesto solo puede apuntar a una categoría de gasto del mismo usuario.
4. **Tests con PGlite** (Postgres en memoria) aplicando las migraciones reales, sin red ni credenciales.

## Alcance

- Incluye:
  - Dependencias y configuración de Drizzle (`drizzle.config.ts`, scripts `db:generate` y `db:migrate`).
  - `src/db/client.ts`: cliente perezoso (importar el módulo sin `DATABASE_URL` no falla; usarlo sin la variable lanza un error claro).
  - Enums y 4 tablas según `system-design.md §2`, con índices, `CHECK` y claves foráneas.
  - Migración inicial generada en `drizzle/`.
  - Tests de restricciones y de migración con PGlite.
  - Actualizar `system-design.md §4` y `§5` con las decisiones 1 y 2.
- No incluye:
  - Servicios, schemas Zod, server actions o UI de ningún módulo (specs 003 en adelante).
  - Sembrado de categorías por defecto (spec 003).
  - Helper de dinero y de fechas (`src/lib/money.ts`, `src/lib/dates.ts`): llegan con la spec 004, que los usa.
  - Tabla `users`: no existe en el MVP (`system-design.md §3`).
  - Row Level Security de Postgres: el aislamiento es por `user_id` + claves compuestas.

## Reutilizar

- `src/lib/auth.ts` (`requireUserId()`): no se modifica; los módulos futuros lo combinan con este cliente.
- `.env.example` ya declara `DATABASE_URL` como secreto.
- Patrón de referencia en `../nexora-app`: `drizzle.config.ts`, `src/lib/db/client.ts` (Proxy perezoso), `src/lib/db/test-db.ts` (PGlite con migraciones reales) y sus tests de restricciones. Se adapta; no se copia tal cual.
- No hay código previo en `src/db` ni en `src/modules` relacionado con datos.

## Archivos

Nuevos:

- `drizzle.config.ts`
- `drizzle/` (migración inicial generada por `drizzle-kit generate`)
- `src/db/client.ts`
- `src/db/client.test.ts`
- `src/db/test-db.ts`
- `src/db/schema/enums.ts`
- `src/db/schema/accounts.table.ts`
- `src/db/schema/categories.table.ts`
- `src/db/schema/transactions.table.ts`
- `src/db/schema/budgets.table.ts`
- `src/db/schema/index.ts`
- `src/db/schema/constraints.test.ts`
- `src/db/migrations.test.ts`

Modificados:

- `package.json`, `package-lock.json`: dependencias `@neondatabase/serverless`, `drizzle-orm`; dev: `drizzle-kit`, `dotenv`, `@electric-sql/pglite`; scripts `db:generate` y `db:migrate`.
- `docs/architecture/system-design.md` (`§4`, `§5`).

## Esquema (resumen vinculante)

Todas las tablas: `id uuid pk default random`, `user_id text not null` (id de Clerk), `created_at` y `updated_at` `timestamptz not null default now()` (`updated_at` con `$onUpdate`).

- Enums: `account_type` (`cash`, `bank`, `card`, `wallet`) y `category_kind` (`income`, `expense`). `transactions.type` usa `category_kind`: una clave foránea compuesta exige columnas de tipo idéntico (corregido durante la implementación; antes la spec proponía un tercer enum `transaction_type`).
- `accounts`: `name`, `type`, `initial_balance_cents bigint not null default 0`, `archived_at timestamptz null`. Únicas: (`user_id`, `name`) y (`id`, `user_id`).
- `categories`: `name`, `kind`, `icon text null`, `color text null`, `archived_at timestamptz null`. Únicas: (`user_id`, `kind`, `name`) y (`id`, `user_id`, `kind`).
- `transactions`: `account_id`, `category_id`, `type`, `amount_cents bigint not null`, `date date not null`, `note text null`. `CHECK (amount_cents > 0)`, `CHECK (note IS NULL OR char_length(note) <= 280)`. FK compuesta (`account_id`, `user_id`) → `accounts(id, user_id)` y FK compuesta (`category_id`, `user_id`, `type`) → `categories(id, user_id, kind)`, ambas `ON DELETE RESTRICT`. Índices: (`user_id`, `date` desc), (`user_id`, `account_id`), (`user_id`, `category_id`).
- `budgets`: `category_id`, `category_kind category_kind not null default 'expense'`, `month date not null`, `amount_cents bigint not null`. `CHECK (category_kind = 'expense')`, `CHECK (amount_cents > 0)`, `CHECK (month = date_trunc('month', month)::date)`. FK compuesta (`category_id`, `user_id`, `category_kind`) → `categories(id, user_id, kind)` `ON DELETE RESTRICT`. Única: (`user_id`, `category_id`, `month`).

## Criterios de aceptación

- AC1: `package.json` declara las dependencias indicadas y los scripts `db:generate` y `db:migrate`.
- AC2: las 4 tablas y 2 enums existen con los campos, tipos, únicas, índices y `CHECK` del apartado "Esquema".
- AC3: `drizzle/` contiene la migración inicial y esta se aplica desde cero sin errores sobre una base vacía.
- AC4: la base rechaza: monto `<= 0`; nota de más de 280 caracteres; transacción con cuenta o categoría de **otro** `user_id`; transacción cuyo `type` no coincide con el `kind` de su categoría; presupuesto sobre una categoría `income` o de otro usuario; presupuesto con `month` que no es el primer día del mes; nombre de cuenta o categoría duplicado para el mismo usuario; duplicado (`user_id`, `category_id`, `month`) en presupuestos.
- AC5: borrar una cuenta o categoría con transacciones falla (`ON DELETE RESTRICT`).
- AC6: importar `src/db/client.ts` sin `DATABASE_URL` no lanza; usar `db` sin la variable lanza un error que menciona `DATABASE_URL` y `.env.local`.
- AC7: ningún componente cliente (`"use client"`) importa `src/db/*`.
- AC8 (manual, requiere `DATABASE_URL` real en `.env.local`): `npm run db:migrate` termina sin errores contra la base de desarrollo de Neon y crea las 4 tablas.
- AC9: `npm run lint`, `npm run test` y `npm run build` pasan; `.env.local` no queda en git; `system-design.md §4` y `§5` reflejan las decisiones 1 y 2.

## Tests requeridos

(Vitest, junto al archivo; usan PGlite con las migraciones reales)

- `src/db/migrations.test.ts`: la migración se aplica desde cero y existen las tablas y enums esperados.
- `src/db/schema/constraints.test.ts`: un caso por cada rechazo de AC4 y AC5, más un caso válido de cada tabla que demuestre que el flujo feliz inserta.
- `src/db/client.test.ts`: AC6 (importación sin variable no lanza; uso sin variable lanza el error esperado).

## Tareas

### T0 — Dependencias y configuración de Drizzle
- Archivos: `package.json`, `package-lock.json`, `drizzle.config.ts`
- Depende de: —
- Paralelizable: no (instala dependencias y toca `package.json`)
- Cubre: AC1

### T1 — Cliente Neon
- Archivos: `src/db/client.ts`, `src/db/client.test.ts`
- Depende de: T0
- Paralelizable: sí (con T2: archivos disjuntos)
- Cubre: AC6, AC7

### T2 — Esquema
- Archivos: `src/db/schema/enums.ts`, `src/db/schema/accounts.table.ts`, `src/db/schema/categories.table.ts`, `src/db/schema/transactions.table.ts`, `src/db/schema/budgets.table.ts`, `src/db/schema/index.ts`
- Depende de: T0
- Paralelizable: sí (con T1)
- Cubre: AC2

### T3 — Migración y tests de restricciones
- Archivos: `drizzle/` (generado con `npm run db:generate`), `src/db/test-db.ts`, `src/db/migrations.test.ts`, `src/db/schema/constraints.test.ts`
- Depende de: T2
- Paralelizable: no
- Cubre: AC3, AC4, AC5

### T4 — Documentación de arquitectura
- Archivos: `docs/architecture/system-design.md`
- Depende de: T2
- Paralelizable: sí (con T3)
- Cubre: AC9 (parte de documentación)

## Preguntas abiertas

1. **Rama de Neon.** Recomiendo crear una rama `dev` en el proyecto de Neon para desarrollo y usar su cadena de conexión con `-pooler` en `DATABASE_URL` (`.env.local`). ¿Se usa una base de desarrollo separada de producción desde ahora?
2. **Aplicar la migración (AC8).** `npm run db:migrate` escribe en tu base de Neon. Solo se ejecuta con tu confirmación explícita y con tu `DATABASE_URL` ya en `.env.local`; el archivo nunca se lee ni se imprime.
3. **Versión de Node.** `@neondatabase/serverless` por WebSocket funciona con el `WebSocket` global de Node 22+. Si tu Node es menor, `T1` debe agregar `ws`. Se confirma con `node -v` al ejecutar.
4. **Claves compuestas.** Añaden algo de complejidad al esquema a cambio de que la base impida datos cruzados entre usuarios o de tipo incorrecto. Se propone mantenerlas; si prefieres validar solo en servicios, se simplifica.

## Próximas fases

- 003: módulos `categories` y `accounts` (servicios, schemas Zod, sembrado de categorías por defecto, UI), y agregar sus entradas a la navegación.
- 004: módulo `transactions` con `src/lib/money.ts` y `src/lib/dates.ts`.
