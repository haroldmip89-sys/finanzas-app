# System design — Finanzas App

Documento de arquitectura. Se cita como `system-design.md §N`. Cualquier cambio de entidades, módulos o propiedad de datos requiere spec aprobada y actualizar este documento.

## 1. Visión y principios

Ver `docs/BRIEF.md`. Principios: multiusuario por diseño, dinero en enteros (céntimos de PEN), validación en el borde, una sola fuente de verdad por dato.

## 2. Entidades

Todas las tablas llevan `id` (uuid, default `gen_random_uuid()`), `user_id` (text, id de Clerk), `created_at` y `updated_at` (`timestamptz`).

### accounts
| Campo | Tipo | Notas |
|---|---|---|
| `name` | text | único por usuario (`user_id`, `name`) |
| `type` | enum | `cash`, `bank`, `card`, `wallet` |
| `initial_balance_cents` | bigint | puede ser negativo (tarjeta) |
| `archived_at` | timestamptz null | archivar en vez de borrar si tiene transacciones |

### categories
| Campo | Tipo | Notas |
|---|---|---|
| `name` | text | único por (`user_id`, `kind`, `name`) |
| `kind` | enum | `income`, `expense` |
| `icon`, `color` | text null | presentación |
| `archived_at` | timestamptz null | |

### transactions
| Campo | Tipo | Notas |
|---|---|---|
| `account_id` | uuid FK → accounts | `ON DELETE RESTRICT` |
| `category_id` | uuid FK → categories | `ON DELETE RESTRICT` |
| `type` | enum | `income`, `expense`; debe coincidir con `categories.kind` |
| `amount_cents` | bigint | `CHECK (amount_cents > 0)`; el signo lo da `type` |
| `date` | date | día local en `America/Lima` |
| `note` | text null | máx. 280 caracteres |

Índices: `(user_id, date desc)`, `(user_id, account_id)`, `(user_id, category_id)`.

### budgets
| Campo | Tipo | Notas |
|---|---|---|
| `category_id` | uuid FK → categories | solo categorías `expense` |
| `month` | date | primer día del mes |
| `amount_cents` | bigint | `CHECK (amount_cents > 0)` |

Único: (`user_id`, `category_id`, `month`).

### Invariantes

1. Un recurso solo se lee o escribe si su `user_id` coincide con el del usuario autenticado; también la cuenta y la categoría referenciadas por una transacción.
2. Saldo de cuenta = `initial_balance_cents` + Σ ingresos − Σ gastos. Se calcula, no se almacena.
3. `transactions.type` = `categories.kind` de su categoría.
4. No se borra una cuenta o categoría con transacciones: se archiva.

## 3. Propiedad de datos

| Dato | Dueño |
|---|---|
| Identidad, sesión, email, perfil | Clerk (la app solo guarda `user_id`) |
| Cuentas, categorías, transacciones, presupuestos | Neon Postgres |

No hay tabla `users` en el MVP; no se requieren webhooks de Clerk.

## 4. Módulos y dependencias permitidas

```
src/modules/
  accounts/      -> depende de: db
  categories/    -> depende de: db
  transactions/  -> depende de: accounts, categories, db
  budgets/       -> depende de: categories, transactions (lectura), db
  dashboard/     -> depende de: transactions, budgets, accounts (solo lectura)
src/db/          -> cliente Neon + Drizzle, `schema.ts`, migraciones en `drizzle/`
src/lib/         -> utilidades (`money.ts` para formato PEN, `dates.ts`, `auth.ts` con `requireUserId()`)
```

Reglas: un módulo no importa de otro fuera de lo listado; los ciclos están prohibidos; `dashboard` nunca escribe.

## 5. Capa de datos y acceso

- Cliente: `@neondatabase/serverless` + `drizzle-orm` (driver `neon-http`; `neon-serverless` si se necesitan transacciones interactivas).
- Mutaciones y lecturas desde el servidor (server actions / route handlers). Cada función de servicio recibe `userId` explícito y lo aplica en todos los `where`.
- `requireUserId()` en `src/lib/auth.ts` llama a `auth()` de Clerk y lanza si no hay sesión; es la única fuente de `userId`.
- Migraciones: `drizzle-kit generate` + `drizzle-kit migrate`; el esquema versionado vive en `drizzle/`.

## 6. Auth y permisos

- Clerk con `clerkMiddleware`; rutas públicas: `/`, `/sign-in`, `/sign-up`. El resto exige sesión.
- Un solo rol. El aislamiento es por `user_id` (ver §2, invariante 1), no por roles.
- Los route handlers y server actions vuelven a verificar la sesión; el middleware no es la única defensa.

## 7. Moneda y formato

- Solo PEN. Montos en céntimos; entrada de usuario `"12.50"` → `1250` mediante un único helper en `src/lib/money.ts` (con tests); nunca `parseFloat` disperso.
- Formato: `Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" })`.

## 8. Decisiones registradas

| # | Decisión | Motivo |
|---|---|---|
| D1 | Neon Postgres + Drizzle; sin Supabase | Una sola base, tipado, migraciones versionadas |
| D2 | Clerk guarda la identidad; la app solo usa `user_id` | Evita sincronizar usuarios en el MVP |
| D3 | Dinero en céntimos enteros | Evitar errores de punto flotante |
| D4 | Sin transferencias ni multimoneda en el MVP | Reducir alcance; el modelo permite añadirlas |
| D5 | Archivar en vez de borrar cuentas/categorías con historial | Integridad histórica |
