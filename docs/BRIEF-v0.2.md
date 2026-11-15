# Finanzas App — Product Brief

**Estado:** Propuesta para revisión  
**Versión:** 0.2  
**Producto:** Finanzas App  
**Tipo:** Aplicación web responsive de finanzas personales  
**Moneda:** Sol peruano (PEN)  
**Enfoque:** Control de gastos, prevención de compras impulsivas y disponibilidad real de dinero.

---

# 1. Visión del producto

Aplicación de finanzas personales que permita registrar y controlar ingresos, gastos, cuentas y tarjetas de crédito, ayudando al usuario a tomar mejores decisiones de consumo.

El producto no debe limitarse a mostrar cuánto dinero se gastó. Debe ayudar a responder tres preguntas:

1. ¿Cuánto dinero puedo gastar realmente?
2. ¿Estoy gastando más de lo que debería?
3. ¿Qué compras impulsivas puedo evitar para mejorar mi situación financiera?

**Objetivo principal de los primeros tres meses:** reducir considerablemente los gastos impulsivos, evitar el déficit mensual y disminuir la dependencia de las tarjetas de crédito.

Principio fundamental:

> La aplicación debe ayudar al usuario a tomar mejores decisiones financieras con el mínimo esfuerzo posible. Cada funcionalidad debe justificar la complejidad que introduce.

# 2. Perfil del usuario y problema que resuelve

El usuario presenta los siguientes patrones de consumo:

- Realiza compras no planificadas en supermercados y tiendas.
- Gasta frecuentemente en restaurantes, transporte y salidas.
- Compra productos que podría posponer o que no son indispensables.
- Utiliza tarjetas de crédito para adquirir productos de mayor importe mediante cuotas.
- Puede terminar utilizando crédito para cubrir gastos que sus ingresos no permiten sostener.
- Necesita conocer su capacidad real de gasto antes de realizar una compra.

La aplicación debe abordar estos comportamientos sin utilizar mensajes culpabilizadores, restricciones excesivas ni procesos complicados.

# 3. Principios de experiencia de usuario

1. **Simplicidad:** las operaciones frecuentes deben requerir pocos pasos.
2. **Visibilidad:** el dinero disponible debe ser el indicador financiero más importante.
3. **Prevención:** ayudar a reflexionar antes de realizar compras no esenciales.
4. **Rapidez:** registrar un gasto o ingreso en pocos segundos.
5. **Claridad:** distinguir saldo bancario, dinero disponible y deuda.
6. **Motivación:** mostrar avances y gastos impulsivos evitados sin inventar ahorros.
7. **Consistencia:** la aplicación debe mantener una experiencia coherente en móvil y escritorio.

# 4. Alcance funcional

## 4.1. Funcionalidades existentes y conservadas

- Autenticación mediante Clerk.
- Aislamiento de información por usuario.
- Cuentas: efectivo, banco, tarjeta de crédito y billetera digital.
- Categorías de ingresos y gastos.
- Transacciones: ingresos, gastos y ajustes.
- Transferencias entre cuentas propias.
- Calibración de saldos.
- Presupuestos mensuales por categoría.
- Dashboard financiero.
- Tema oscuro por defecto y alternancia oscuro/claro/sistema.
- Diseño responsive mobile-first.

## 4.2. Nueva funcionalidad: Dinero disponible

**Prioridad: P0**

Será el principal indicador del dashboard.

No debe confundirse el saldo total de las cuentas con el dinero que el usuario puede gastar libremente.

El indicador debe considerar:

- Saldos líquidos de efectivo, bancos y billeteras.
- Obligaciones económicas pendientes.
- Pagos de tarjetas de crédito que vencen dentro del período de planificación.
- Cuotas de compras financiadas que vencen dentro del período.
- Reservas personales configuradas por el usuario.

Fórmula conceptual:

Dinero disponible = Dinero líquido - Obligaciones pendientes - Reservas.

El período de planificación debe considerar la próxima fecha de ingreso conocida o, si no existe, el período definido por el usuario.

### Reglas

- No contar las cuentas de crédito como dinero líquido.
- No contar transferencias como ingresos ni gastos.
- No descontar dos veces una misma obligación.
- Mostrar cómo se calculó el importe.
- Permitir identificar qué compromisos están reduciendo el dinero disponible.
- Mostrar la fecha de última actualización de los saldos.
- Cuando falte información, indicar que el resultado es estimado.

El indicador debe mostrar un importe principal y una explicación accesible de sus componentes.

No se debe presentar un saldo estimado como si fuera un saldo bancario confirmado.

## 4.3. Nueva funcionalidad: Compras impulsivas evitadas

**Prioridad: P1**

Permitir registrar una compra que el usuario decidió no realizar o posponer.

Datos mínimos:

- Importe estimado.
- Categoría opcional.
- Fecha.
- Motivo opcional: no necesario, fuera de presupuesto, puedo esperar u otro.

No debe crear una transacción financiera.

### Dashboard

Mostrar:

- Número de compras evitadas.
- Importe total de compras evitadas.
- Comparación por períodos.
- Categorías en las que se evitan más compras.

**Regla importante:** el importe de compras evitadas no representa dinero ahorrado real. Es un indicador de comportamiento y no debe incrementar el saldo de cuentas ni el dinero disponible.

El usuario puede decidir si una compra fue evitada definitivamente o simplemente pospuesta.

## 4.4. Nueva funcionalidad: Compra consciente

**Prioridad: P1**

Antes de registrar una compra, ofrecer una experiencia breve para ayudar al usuario a reflexionar.

Preguntas opcionales:

- ¿Es una compra necesaria?
- ¿Está dentro de tu presupuesto?
- ¿Puedes pagarla sin comprometer tus obligaciones?

Para compras no esenciales que superen un umbral configurable, ofrecer una pausa de reflexión.

La pausa puede ser de 10 minutos o 24 horas.

Reglas:

- Nunca bloquear una compra.
- No exigir responder preguntas para registrar un gasto.
- No mostrar advertencias constantemente.
- Evitar mensajes culpabilizadores.
- Permitir configurar o desactivar las advertencias.

## 4.5. Registro rápido de movimientos

**Prioridad: P0**

Debe existir un botón global "+" accesible desde cualquier sección autenticada.

Al pulsarlo, se abre un panel de registro con tres opciones:

1. Nuevo gasto.
2. Nuevo ingreso.
3. Transferencia.

### Comportamiento responsive

**Móvil:**
- Bottom sheet o drawer inferior.
- Aprovechar el ancho disponible.
- Controles táctiles de al menos 44 px.
- Formularios accesibles con una mano.

**Escritorio:**
- Dialog o panel lateral.
- No navegar a otra página para registrar movimientos sencillos.

### Formulario de gasto

Campos:

- Importe (obligatorio).
- Categoría (obligatoria).
- Cuenta o tarjeta (obligatoria).
- Fecha (por defecto hoy).
- Descripción (opcional).

### Formulario de ingreso

Campos:

- Importe.
- Categoría.
- Cuenta de destino.
- Fecha.
- Descripción opcional.

### Formulario de transferencia

Campos:

- Cuenta de origen.
- Cuenta de destino.
- Importe.
- Fecha.
- Descripción opcional.

### Optimizaciones

- Mostrar primero las categorías más utilizadas.
- Recordar la última cuenta seleccionada.
- Utilizar teclado numérico para el importe.
- Permitir guardar y agregar otro movimiento.
- Confirmación breve mediante toast.
- Mantener validaciones y controles de integridad en servidor.

No almacenar información innecesaria para registrar un movimiento.

## 4.6. Control básico de tarjetas de crédito

**Prioridad: P0**

Las tarjetas son cuentas de crédito, no dinero disponible.

La aplicación debe diferenciar:

- Compras con tarjeta.
- Deuda pendiente.
- Cuotas futuras.
- Pagos realizados.
- Intereses y comisiones.

### Compras en cuotas

Permitir registrar una compra financiada con:

- Importe total.
- Número de cuotas.
- Fecha de compra.
- Fecha de primera cuota.
- Tarjeta utilizada.

Mostrar:

- Importe de cada cuota.
- Cuotas pendientes.
- Próximos vencimientos.
- Total pendiente de pago.

### Reglas contables

- La compra representa un gasto.
- El pago de la tarjeta representa una transferencia entre cuentas, no un segundo gasto.
- Los intereses y comisiones sí representan gastos.
- Las devoluciones deben poder asociarse a la compra original.
- Los compromisos futuros deben influir en la planificación del dinero disponible según su vencimiento.

No construir todavía un módulo completo de gestión de préstamos o amortizaciones complejas.

## 4.7. Dashboard orientado a decisiones

**Prioridad: P0**

Orden visual recomendado:

1. Dinero disponible.
2. Próximas obligaciones financieras.
3. Gastos del mes.
4. Deuda de tarjetas.
5. Presupuesto restante.
6. Comportamiento de consumo.
7. Compras impulsivas evitadas.
8. Últimos movimientos.

Los gráficos y reportes detallados deben estar en una sección secundaria.

El dashboard debe responder rápidamente:

- ¿Cuánto puedo gastar?
- ¿Cuánto he gastado?
- ¿Estoy excediendo mis límites?
- ¿Qué obligaciones tengo próximas?
- ¿Cómo estoy mejorando mis hábitos?

## 4.8. Resumen financiero semanal

**Prioridad: P1**

Mostrar un resumen breve de:

- Total gastado durante la semana.
- Comparación con la semana anterior.
- Categorías con mayor gasto.
- Compras impulsivas evitadas.
- Evolución del dinero disponible.

No generar notificaciones constantes ni mensajes que culpabilicen al usuario.

# 5. Navegación principal

Mantener una navegación sencilla con cuatro destinos:

1. Inicio.
2. Movimientos.
3. Cuentas.
4. Análisis.

El botón "+" debe estar siempre disponible como acción global.

Presupuestos, categorías, tarjetas, calibración y configuración pueden estar dentro de las secciones correspondientes.

En móvil utilizar barra inferior con máximo cuatro o cinco destinos.

En escritorio utilizar sidebar.

# 6. Stack tecnológico

Mantener el stack actual:

| Área | Tecnología |
|---|---|
| Framework | Next.js 16 App Router |
| UI | React 19 |
| Lenguaje | TypeScript strict |
| Estilos | Tailwind CSS v4 |
| Componentes | shadcn/ui base-nova / Base UI |
| Auth | Clerk |
| Base de datos | Neon PostgreSQL |
| ORM | Drizzle ORM |
| Validación | Zod v4 |
| Datos en cliente | TanStack Query v5 |
| Tests | Vitest + React Testing Library |

No introducir nuevas dependencias sin justificar su necesidad.

No migrar de npm a pnpm como parte de este cambio.

# 7. Principios técnicos y financieros

Conservar las reglas técnicas originales:

1. Dinero almacenado en céntimos enteros.
2. Aislamiento estricto mediante user_id.
3. Validación con Zod en servidor.
4. Fechas financieras interpretadas en America/Lima.
5. Integridad referencial en PostgreSQL.
6. Secretos exclusivamente en variables de entorno.
7. Componentes responsive y accesibles.
8. Lógica financiera separada de la presentación.

### Reglas adicionales

- Las transferencias no alteran el gasto ni el ingreso consolidado.
- Las compras con tarjeta no deben duplicarse al pagar la tarjeta.
- Los gastos evitados no generan movimientos financieros.
- Los ajustes de saldo no deben aparecer como ingresos ni gastos ordinarios.
- Los cálculos de dinero disponible deben ser reproducibles y explicables.
- Los cálculos deben evitar descontar dos veces obligaciones ya contabilizadas.
- Toda operación financiera debe mantener consistencia ante errores o reintentos.

# 8. Seguridad y privacidad

- Los datos financieros pertenecen exclusivamente a su usuario.
- Las consultas se ejecutan en servidor.
- No confiar en identificadores de usuario enviados por el cliente.
- Validar todos los importes y relaciones.
- No almacenar contraseñas bancarias.
- Las integraciones bancarias futuras utilizarán mecanismos autorizados de conexión y consentimiento.
- No exponer saldos o movimientos mediante logs públicos.

# 9. Roadmap y estado de implementación

El proyecto ya se encuentra en la Spec 006. No reiniciar ni reimplementar specs terminadas.

| Spec | Descripción | Estado / prioridad |
|---|---|---|
| 001 | Auth Clerk | Existente |
| 001b | Tema y layout | Existente |
| 002 | Database schema | Existente |
| 003 | Categories and accounts | Existente |
| 004 | Transactions | Existente |
| 005 | Transfers | Implementada |
| 006 | Quick actions | En curso / P0 |
| 007 | Balance calibration | Según estado del repositorio |
| 008 | Budgets | P1 |
| 009 | Dashboard home | P0 |
| 009a | Available-to-spend | Nueva / P0 |
| 010 | Hardening | P0 antes del despliegue |
| 010a | Impulse spending | Nueva / P1 |
| 010b | Weekly financial review | Nueva / P1 |
| 011 | PWA | Pospuesto |
| 012 | UI redesign | Evolutivo |

La numeración es orientativa. No modificar identificadores de specs existentes ni documentos históricos sin necesidad.

# 10. Fuera del MVP

- Multimoneda.
- Integración bancaria automática.
- Scraping de banca móvil.
- Metas de ahorro complejas.
- Préstamos y amortizaciones avanzadas.
- Cuentas compartidas.
- Organizaciones.
- Inteligencia artificial para recomendaciones financieras personalizadas.
- Notificaciones push constantes.
- Aplicación móvil nativa.
- Sincronización offline compleja.

# 11. Criterios de éxito del producto

Durante los primeros tres meses evaluar:

- Porcentaje de gastos registrados.
- Frecuencia de utilización del registro rápido.
- Evolución del gasto impulsivo.
- Número e importe de compras evitadas.
- Diferencias entre dinero disponible estimado y saldos reales.
- Reducción de gastos financiados con nuevas compras en cuotas.
- Capacidad de terminar los períodos mensuales sin déficit.

El objetivo no es aumentar el tiempo de uso de la aplicación. Es mejorar la situación financiera del usuario.

---

**Principio final del producto:**

Una buena aplicación financiera no es la que permite registrar más información, sino la que ayuda a tomar mejores decisiones con menos esfuerzo.