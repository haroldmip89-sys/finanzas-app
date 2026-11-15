# Finanzas App — Product Brief

**Estado:** Vigente  
**Versión:** 0.2 (integra la propuesta `docs/BRIEF-v0.2.md` con el estado real del repositorio)  
**Producto:** Finanzas App  
**Tipo:** Aplicación web responsive de finanzas personales  
**Moneda:** Sol peruano (PEN)  
**Enfoque:** control de gastos, prevención de compras impulsivas y disponibilidad real de dinero.

---

## 1. Visión

Aplicación de finanzas personales para registrar y controlar ingresos, gastos, cuentas y tarjetas de crédito, que ayude a tomar mejores decisiones de consumo. Uso inicial personal; diseñada desde el día uno como multiusuario (cada usuario solo ve sus datos).

No debe limitarse a mostrar cuánto se gastó. Debe ayudar a responder tres preguntas:

1. ¿Cuánto dinero puedo gastar realmente?
2. ¿Estoy gastando más de lo que debería?
3. ¿Qué compras impulsivas puedo evitar para mejorar mi situación financiera?

**Objetivo de los primeros tres meses:** reducir considerablemente los gastos impulsivos, evitar el déficit mensual y disminuir la dependencia de las tarjetas de crédito.

> Principio fundamental: ayudar al usuario a tomar mejores decisiones financieras con el mínimo esfuerzo posible. Cada funcionalidad debe justificar la complejidad que introduce.

## 2. Perfil del usuario y problema

Patrones de consumo que la app debe abordar: compras no planificadas en supermercados y tiendas; gasto frecuente en restaurantes, transporte y salidas; compras que podrían posponerse; uso de tarjetas de crédito en cuotas para compras de mayor importe; riesgo de usar crédito para cubrir gastos que el ingreso no sostiene; falta de claridad sobre la capacidad real de gasto antes de comprar.

Sin mensajes culpabilizadores, sin restricciones excesivas y sin procesos complicados.

## 3. Principios de experiencia de usuario

1. **Simplicidad:** las operaciones frecuentes requieren pocos pasos.
2. **Visibilidad:** el dinero disponible es el indicador financiero más importante.
3. **Prevención:** ayudar a reflexionar antes de compras no esenciales.
4. **Rapidez:** registrar un gasto o ingreso en pocos segundos, en la calle y con una mano.
5. **Claridad:** distinguir saldo bancario, dinero disponible y deuda.
6. **Motivación:** mostrar avances y gastos impulsivos evitados sin inventar ahorros.
7. **Consistencia:** experiencia coherente en móvil y escritorio.

## 4. Estado de implementación (2026-11-15)

Hechas y verificadas (specs 001 a 006), no se reimplementan:

- Autenticación con Clerk y aislamiento de datos por `user_id`.
- Tema oscuro por defecto con alternancia oscuro / claro / sistema; shell responsive; login a pantalla dividida con carrusel.
- Cuentas (efectivo, banco, tarjeta, billetera digital) con saldo inicial y **saldo actual calculado**.
- Categorías de ingreso y gasto con set por defecto.
- Transacciones: ingresos y gastos con filtros, paginación y resumen del período.
- Transferencias entre cuentas propias (no cuentan como ingreso ni gasto).
- Registro rápido: botón "+" global, acciones rápidas en el inicio, categorías más usadas como botones, última cuenta recordada, "Guardar y agregar otro" y confirmación con toast.

Pendiente (el v0.2 lo lista como "existente", pero aún no está construido): calibración de saldos, presupuestos mensuales, dashboard completo, y todo lo marcado como nuevo en la sección 5.

## 5. Alcance funcional

### 5.1. Dinero disponible — P0 (nuevo)

Será el indicador principal del dashboard. El saldo total de las cuentas no es el dinero que se puede gastar libremente.

Considera: saldos líquidos de efectivo, bancos y billeteras; obligaciones pendientes; pagos de tarjetas que vencen en el período; cuotas de compras financiadas que vencen en el período; reservas personales configuradas.

> Dinero disponible = Dinero líquido − Obligaciones pendientes − Reservas.

El período de planificación llega hasta la próxima fecha de ingreso conocida o, si no existe, hasta la fecha que defina el usuario.

Reglas:

- Las cuentas de crédito (tarjetas) no son dinero líquido.
- Las transferencias no cuentan como ingreso ni gasto.
- No descontar dos veces una misma obligación.
- Mostrar cómo se calculó el importe y qué compromisos lo reducen.
- Mostrar la fecha de última actualización de los saldos.
- Si falta información, indicar que el resultado es **estimado**; nunca presentarlo como un saldo bancario confirmado.

### 5.2. Compras impulsivas evitadas — P1 (nuevo)

Registrar una compra que el usuario decidió no hacer o posponer: importe estimado, categoría opcional, fecha, motivo opcional (no necesario, fuera de presupuesto, puedo esperar, otro). **No crea una transacción financiera.**

Dashboard: número e importe de compras evitadas, comparación por períodos y categorías donde más se evitan. El importe **no es dinero ahorrado real**: no incrementa saldos ni el dinero disponible. El usuario puede marcar una compra como evitada definitivamente o solo pospuesta.

### 5.3. Compra consciente — P1 (nuevo)

Antes de registrar una compra, una experiencia breve y opcional: ¿es necesaria?, ¿está dentro del presupuesto?, ¿puedo pagarla sin comprometer mis obligaciones? Para compras no esenciales que superen un umbral configurable, ofrecer una pausa de reflexión de 10 minutos o 24 horas.

Reglas: nunca bloquear una compra; no exigir respuestas para registrar un gasto; no mostrar advertencias constantemente; sin mensajes culpabilizadores; configurable y desactivable.

### 5.4. Registro rápido — P0 (parcialmente hecho)

Botón global "+" accesible desde cualquier sección autenticada con Nuevo gasto, Nuevo ingreso y Transferencia. **Hecho:** botón flotante, menú, acciones del inicio, categorías más usadas, última cuenta, "Guardar y agregar otro", toast. **Pendiente:**

- En móvil, el formulario como **bottom sheet** (hoy es un diálogo centrado); en escritorio sigue siendo diálogo o panel. Se implementa con el diálogo actual, sin dependencia nueva, salvo que se justifique.
- Mantener controles táctiles de al menos 44 px, teclado numérico para el importe y validaciones de integridad en servidor.

### 5.5. Control básico de tarjetas de crédito — P0 (nuevo)

Las tarjetas son cuentas de crédito, no dinero disponible. Diferenciar compras con tarjeta, deuda pendiente, cuotas futuras, pagos realizados e intereses y comisiones.

**Compras en cuotas:** importe total, número de cuotas, fecha de compra, fecha de primera cuota y tarjeta. Mostrar importe de cada cuota, cuotas pendientes, próximos vencimientos y total pendiente.

Reglas contables:

- La compra es un gasto.
- El **pago de la tarjeta es una transferencia** entre cuentas (ya soportado), no un segundo gasto.
- Intereses y comisiones sí son gastos.
- Las devoluciones se asocian a la compra original.
- Los compromisos futuros influyen en el dinero disponible según su vencimiento.

No construir un módulo completo de préstamos ni amortizaciones complejas.

### 5.6. Dashboard orientado a decisiones — P0

Orden visual: dinero disponible; próximas obligaciones; gastos del mes; deuda de tarjetas; presupuesto restante; comportamiento de consumo; compras evitadas; últimos movimientos. Los gráficos y reportes detallados van en una sección secundaria. Debe responder rápido: cuánto puedo gastar, cuánto he gastado, si excedo mis límites, qué obligaciones vienen y cómo mejoran mis hábitos.

### 5.7. Resumen financiero semanal — P1 (nuevo)

Total gastado en la semana, comparación con la anterior, categorías con más gasto, compras evitadas y evolución del dinero disponible. Sin notificaciones constantes ni mensajes culpabilizadores.

## 6. Navegación principal

Propuesta del v0.2: **cuatro destinos** — Inicio, Movimientos, Cuentas, Análisis — y el botón "+" siempre disponible. Presupuestos, categorías, tarjetas, calibración y configuración viven dentro de las secciones correspondientes. Móvil: barra inferior de 4 o 5 destinos; escritorio: sidebar.

Hoy hay cinco destinos (Dashboard, Transacciones, Transferencias, Cuentas, Categorías). La reorganización propuesta, a precisar en la spec 006b:

- **Inicio:** panel con dinero disponible y acciones rápidas.
- **Movimientos:** pestañas Transacciones y Transferencias.
- **Cuentas:** cuentas y tarjetas, con calibración de saldos por cuenta.
- **Análisis:** presupuestos, resumen mensual y semanal, compras evitadas.
- **Categorías y ajustes:** fuera de la barra principal, accesibles desde el menú de usuario o desde donde se usan.

## 7. Stack

Se mantiene el stack actual. No introducir dependencias nuevas sin justificarlas. Se queda en **npm** (decidido; no migrar a pnpm). No se usa Supabase.

| Área | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript strict |
| UI | Tailwind v4 + shadcn/ui (`base-nova`, Base UI) |
| Auth | Clerk (`@clerk/nextjs`) |
| Base de datos | Neon (Postgres serverless) |
| ORM / migraciones | Drizzle ORM + drizzle-kit |
| Validación | Zod v4 |
| Datos en cliente | TanStack Query v5 |
| Formularios | react-hook-form + resolver de Zod |
| Avisos | sonner |
| Tests | Vitest + React Testing Library (PGlite para la base) |

## 8. Principios técnicos y financieros

1. **Dinero en enteros.** Montos en céntimos (`bigint`), nunca float; formato `S/ 1,234.50` solo en presentación.
2. **Aislamiento por usuario.** Toda consulta filtra por `user_id` obtenido de `auth()` en el servidor; nunca se confía en un id del cliente.
3. **Validación en tres capas.** Zod en el borde, reglas de negocio en el servicio y restricciones de la base (`CHECK`, claves compuestas).
4. **Fechas.** Día calendario (`date`) interpretado en `America/Lima`; auditoría en `timestamptz`.
5. **Integridad en la base.** Claves foráneas, restricciones únicas e índices por `(user_id, date)`.
6. **Responsive y dark siempre.** Criterios de aceptación a 360, 768 y 1280 px, sin scroll horizontal, solo tokens semánticos de color. Lección aprendida: en una cuadrícula, los elementos con texto largo necesitan `min-w-0` para que `truncate` funcione.
7. **Código mantenible.** Lógica en hooks, componentes reutilizables y errores controlados (`docs/SETUP.md §2`).
8. **Secretos fuera del repo.** Solo en `.env.local` y en las variables del hosting.

Reglas financieras adicionales (v0.2):

- Las transferencias no alteran el gasto ni el ingreso consolidado.
- Las compras con tarjeta no se duplican al pagar la tarjeta.
- Los gastos evitados no generan movimientos financieros.
- Los **ajustes de saldo** no aparecen como ingresos ni gastos ordinarios.
- Los cálculos de dinero disponible son reproducibles y explicables, y no descuentan dos veces una obligación ya contabilizada.
- Toda operación financiera mantiene consistencia ante errores o reintentos.

## 9. Seguridad y privacidad

- Los datos financieros pertenecen solo a su usuario; las consultas se ejecutan en servidor.
- Validar todos los importes y relaciones.
- No almacenar contraseñas bancarias; las integraciones bancarias futuras usarán conexión autorizada y consentimiento.
- No exponer saldos ni movimientos en logs públicos.

## 10. Roadmap y orden de ejecución

La numeración conserva los identificadores del v0.2 y añade letras para lo nuevo. La columna **Orden** es el orden recomendado de construcción.

| Orden | Spec | Descripción | Prioridad | Estado |
|---|---|---|---|---|
| — | 001, 001b, 001c | Auth, tema y layout, login con carrusel | — | Hecha |
| — | 002 a 005 | Base de datos, cuentas y categorías, transacciones, transferencias | — | Hecha |
| — | 006 | Acciones rápidas | P0 | Hecha |
| 1 | 006b | Navegación a 4 destinos y formularios como bottom sheet en móvil | P0 | Pendiente |
| 2 | 007 | Calibración de saldos (ajuste, fuera de ingresos y gastos) | P0 | Pendiente |
| 3 | 007a | Tarjetas de crédito: cuentas de crédito, deuda, pago como transferencia, cuotas | P0 | Pendiente (nuevo) |
| 4 | 008 | Presupuestos mensuales por categoría | P1 | Pendiente |
| 5 | 009a | Dinero disponible (fórmula, explicación, reservas, obligaciones) | P0 | Pendiente (nuevo) |
| 6 | 009 | Dashboard orientado a decisiones | P0 | Pendiente |
| 7 | 010 | Endurecimiento y despliegue en Vercel + Neon | P0 | Pendiente, antes de desplegar |
| 8 | 010a | Compras impulsivas evitadas | P1 | Pendiente (nuevo) |
| 9 | 010c | Compra consciente | P1 | Pendiente (nuevo) |
| 10 | 010b | Resumen financiero semanal | P1 | Pendiente (nuevo) |
| 11 | 011 | PWA | — | Pospuesta |
| 12 | 012 | Rediseño visual con Artifact Design | — | Evolutivo |

Cambios respecto al v0.2: se añaden 006b y 007a, que el v0.2 pide (navegación, tarjetas) pero no numera; la spec 009a (dinero disponible) se construye **antes** que el dashboard, porque este lo muestra primero y depende de tarjetas y reservas; y la compra consciente recibe el id 010c, porque el v0.2 no le asigna uno.

Recomendación de fases para contener el alcance (las specs 007a y 009a son las más grandes):

- **007a-1:** tarjetas como cuentas de crédito (día de cierre y de pago, límite opcional), deuda visible y pago como transferencia. **007a-2:** compras en cuotas, vencimientos y devoluciones.
- **009a v1:** líquido − deuda de tarjetas que vence en el período − reservas, marcado como estimado. **v2:** suma las cuotas futuras cuando exista 007a-2.

## 11. Decisiones por resolver

Se cierran al escribir cada spec, siempre con aprobación del usuario:

1. **Representación de los ajustes de saldo (007).** Opciones: transacciones marcadas como ajuste con categorías de sistema (no entran en totales ni presupuestos), o un nuevo tipo de transacción. Hoy el tipo de la transacción debe coincidir con el tipo de la categoría por una clave compuesta.
2. **Liquidez de las cuentas.** Se propone derivarla del tipo: efectivo, banco y billetera son líquidos; tarjeta es crédito. Las tarjetas necesitarán campos propios (cierre, vencimiento, límite).
3. **Obligaciones pendientes más allá de las tarjetas.** El v0.2 menciona obligaciones en general; se propone que la primera versión incluya solo tarjetas, cuotas y reservas.
4. **Período de planificación.** Fecha de próximo ingreso conocida o fecha elegida por el usuario: ¿se configura en ajustes o se pregunta al usuario?
5. **Umbral de la compra consciente** y duración por defecto de la pausa (10 minutos o 24 horas).
6. **Bottom sheet.** Estilizar el diálogo actual (sin dependencia) frente a agregar una librería de drawer.
7. **Dónde viven Categorías y ajustes** al pasar a cuatro destinos.

## 12. Fuera del MVP

Multimoneda; integración bancaria automática y scraping de banca móvil; metas de ahorro complejas; préstamos y amortizaciones avanzadas; cuentas compartidas y organizaciones; inteligencia artificial para recomendaciones; notificaciones push constantes; aplicación móvil nativa; sincronización offline compleja; importación y exportación; adjuntos.

## 13. Criterios de éxito

Durante los primeros tres meses evaluar: porcentaje de gastos registrados; frecuencia de uso del registro rápido; evolución del gasto impulsivo; número e importe de compras evitadas; diferencia entre el dinero disponible estimado y los saldos reales; reducción de gastos financiados con nuevas compras en cuotas; capacidad de terminar los meses sin déficit.

El objetivo no es aumentar el tiempo de uso, sino mejorar la situación financiera del usuario.

## 14. Después del MVP: app móvil

Sin fecha; primero se termina el MVP web.

1. **PWA (recomendada, spec 011):** instalable desde el navegador con icono y pantalla completa, en Android y iPhone; poco trabajo y compatible con Vercel.
2. **Envoltura nativa (Capacitor):** permite publicar en tiendas, pero Apple suele rechazar webs envueltas.
3. **App nativa con Expo:** mejor experiencia, pero exige reescribir la interfaz y exponer una API (hoy se usan server actions, que sirven solo a la web). Los servicios ya están separados de la interfaz, así que se podrían exponer como route handlers. Solo si hacen falta widgets, notificaciones o uso sin conexión.

## 15. Referencia: proyecto previo

`../app-finanzas` es un prototipo solo-frontend (dashboard, budget, transactions, categories) sin auth ni base de datos. Se usa como **fuente de UI a migrar** (componentes en inglés, `kebab-case`, dentro de `src/modules/*`), no como base de código.

---

**Principio final del producto:** una buena aplicación financiera no es la que permite registrar más información, sino la que ayuda a tomar mejores decisiones con menos esfuerzo.
