# Finanzas App — Product Brief

**Estado:** Borrador para revisión
**Versión:** 0.1
**Producto:** Finanzas App
**Tipo:** Aplicación web de finanzas y gastos personales

## 1. Visión

Aplicación para registrar y controlar ingresos y gastos personales en soles (PEN). Uso inicial personal; diseñada desde el día uno como multiusuario (cada usuario solo ve sus propios datos) para poder abrirla a más personas sin rehacer la base.

## 2. Alcance del MVP

Un MVP robusto: poco alcance funcional, pero con auth, aislamiento de datos, validación y tests desde el inicio.

**Incluye**

- Registro e inicio de sesión (Clerk).
- Cuentas (efectivo, banco, tarjeta, billetera digital) con saldo inicial.
- Categorías de ingreso y gasto (con set por defecto sembrado al primer ingreso del usuario).
- Transacciones: ingreso o gasto, monto, fecha, cuenta, categoría, nota. Crear, editar, eliminar, listar con filtros (rango de fechas, tipo, cuenta, categoría) y paginación.
- Transferencias entre cuentas propias (ej. de BBVA a Yape): mueven dinero sin contar como ingreso ni gasto.
- Presupuesto mensual por categoría de gasto, con avance (gastado vs. presupuestado).
- Dashboard: saldo total, ingresos y gastos del mes, gasto por categoría, avance de presupuestos, últimas transacciones.
- **Totalmente responsive** (mobile-first): toda pantalla usable desde 360 px hasta escritorio, sin scroll horizontal. Navegación: barra inferior o menú en móvil, sidebar en escritorio. Tablas y listados se adaptan (tarjetas en móvil). Formularios y diálogos usables con teclado táctil, objetivos táctiles ≥ 44 px.
- **Tema dark por defecto**: la app arranca en oscuro usando los tokens `.dark` de `src/app/globals.css` (`<html class="dark">`). Todos los componentes y gráficos deben verse bien en oscuro (contraste AA). **Tema intercambiable dark ↔ light** con un botón en la UI (opciones: oscuro, claro, sistema; por defecto oscuro). La preferencia se guarda en el navegador (`next-themes`, localStorage + cookie), sin tabla ni llamada a Neon o Clerk. Los componentes de Clerk (`SignIn`, `SignUp`, `UserButton`) siguen el tema activo con el tema `shadcn` de `@clerk/ui`, que lee los tokens CSS de la app.

**Fuera del MVP (no construir)**

- Multimoneda y tipo de cambio (solo PEN).
- Transacciones recurrentes, metas de ahorro, deudas.
- Importación/exportación (CSV, bancos), adjuntos.
- Organizaciones o cuentas compartidas entre usuarios.
- App móvil nativa, notificaciones.

## 3. Usuarios

Un único rol: **usuario autenticado**. Sin acceso público salvo la landing y las pantallas de sign-in/sign-up. Cada fila de datos pertenece a un `userId` de Clerk y nunca se expone a otro usuario.

## 4. Stack

| Área | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript strict |
| UI | Tailwind v4 + shadcn/ui (`base-nova`, Base UI) |
| Auth | Clerk (`@clerk/nextjs`) |
| Base de datos | Neon (Postgres serverless) |
| ORM / migraciones | Drizzle ORM + drizzle-kit |
| Validación | Zod v4 |
| Datos en cliente | TanStack Query v5 (+ Table v9 para listados) |
| Tests | Vitest + React Testing Library |

No se usa Supabase.

## 5. Principios de robustez

1. **Dinero en enteros.** Los montos se guardan en céntimos (`amount_cents`, `integer`/`bigint`), nunca como float. Se formatean a `S/ 1,234.50` solo en la capa de presentación (`Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" })`).
2. **Aislamiento por usuario.** Toda consulta filtra por `user_id` obtenido de `auth()` en el servidor. Nunca se confía en un `userId` que venga del cliente.
3. **Validación en el borde.** Todo input (server actions / route handlers) se valida con Zod antes de tocar la DB.
4. **Fechas.** La fecha de una transacción es un `date` (sin hora) interpretado en `America/Lima`; los timestamps de auditoría (`created_at`, `updated_at`) son `timestamptz`.
5. **Integridad en la DB.** Claves foráneas, `CHECK (amount_cents > 0)`, índices por `(user_id, date)` y restricciones únicas donde aplique.
6. **Responsive y dark siempre.** Cada spec de UI incluye criterios de aceptación a 360 px, 768 px y 1280 px, en tema oscuro. Se usan clases Tailwind mobile-first y tokens semánticos (`bg-background`, `text-foreground`), nunca colores fijos.
7. **Código mantenible.** Lógica en hooks, componentes reutilizables y errores controlados en tres capas de validación (ver `docs/SETUP.md §2`, "Convenciones adicionales").
8. **Secretos fuera del repo.** Claves de Clerk y `DATABASE_URL` solo en `.env.local` / variables del hosting; `.env.example` documenta los nombres.

## 6. Plan de specs (orden sugerido)

| # | Spec | Contenido |
|---|---|---|
| 001 | auth-clerk | `ClerkProvider`, middleware que protege rutas, páginas sign-in/sign-up, layout autenticado |
| 001b | theme-and-layout | Tema dark por defecto + toggle dark/light con `next-themes` (Clerk sigue el tema vía el tema `shadcn` de `@clerk/ui`), shell responsive: sidebar en escritorio, navegación inferior/menú en móvil |
| 002 | database-schema | Drizzle + Neon, esquema, migraciones, helper de acceso por usuario, `.env.example` |
| 003 | categories-and-accounts | Módulos `categories` y `accounts`, seed de categorías por defecto |
| 004 | transactions | Módulo `transactions`: CRUD, filtros, paginación, formato PEN |
| 005 | transfers | Transferencias entre cuentas propias: tabla `transfers`, CRUD, y saldo por cuenta que las incluye |
| 006 | budgets | Presupuesto mensual por categoría y su avance |
| 007 | dashboard | Resumen mensual y gráficos, migrando la UI útil de `app-finanzas` |
| 008 | hardening | Rate limiting básico, estados de error/vacío/carga, accesibilidad, tests transversales, deploy (Vercel + Neon) |

## 7. Referencia: proyecto previo

`../app-finanzas` es un prototipo solo-frontend (dashboard, budget, transactions, categories) sin auth ni base de datos. Se usa como **fuente de UI a migrar** (componentes en inglés, `kebab-case`, dentro de `src/modules/*`), no como base de código.
