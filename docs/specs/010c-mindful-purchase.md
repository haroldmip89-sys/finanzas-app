# Compra consciente

Estado: borrador

## Objetivo

Ayudar a no gastar por impulso **en el momento de registrar un gasto**, sin bloquear nada y sin culpa (`docs/BRIEF.md §5.3`). Antes de guardar un gasto grande, la app muestra en una pausa breve los hechos que importan (cuánto te deja de disponible, cómo queda tu presupuesto de esa categoría) y una pregunta: ¿es necesaria? El usuario siempre puede registrar el gasto con un toque.

Referencias: `docs/BRIEF.md §5.3, §5.2`, specs 008 (presupuestos), 009a (dinero disponible), 010a (compras evitadas) y 006/006b (formulario de transacción).

## Decisiones (con mi recomendación)

1. **Cuándo aparece:** solo al **crear un gasto** (no al editar, ni ingresos, transferencias, pagos de tarjeta o ajustes) cuyo importe sea **mayor o igual al umbral**. Umbral por defecto: **S/ 100**, configurable. Sin umbral alcanzado, el formulario funciona exactamente como hoy (cero fricción en el gasto diario).
2. **"No esencial":** no se agrega un marcador a las categorías (YAGNI). La primera pregunta es del usuario: "¿Es necesaria?". Si responde "Sí, es necesaria", se registra de inmediato y no se muestran más datos.
3. **Nunca bloquea:** el botón "Registrar gasto" está siempre disponible, sin respuestas obligatorias.
4. **Hechos, no sermones:** solo cifras calculadas con las reglas existentes, en tono neutro y sin alarma ni rojo de error. Si todo está bien ("dentro del presupuesto", "te sigue alcanzando"), la pantalla lo dice en positivo.
5. **Pausa de reflexión ("Pensarlo"):** no guarda ninguna transacción. Registra la compra como **pospuesta** con la spec 010a (no es dinero ahorrado real) y cierra el formulario. **Depende de 010a** (orden del roadmap: 010a antes que 010c). Los 10 minutos o 24 horas son el momento sugerido para volver a decidir; no hay notificaciones push.
6. **Dónde se guarda la configuración:** tabla pequeña `user_settings` en Neon (una fila por usuario: activada sí/no y umbral), para que valga en todos tus dispositivos. Alternativa más simple: `localStorage` (sin migración, pero solo en ese navegador). **Recomiendo la tabla.**

## Alcance

- Incluye:
  - Paso "Antes de registrar" dentro del formulario de gasto, cuando se cumplen las condiciones de la decisión 1.
  - Pregunta "¿Es necesaria?" con tres opciones: Es necesaria, Puedo esperar, Es un antojo. Se guarda solo como contexto de la compra pospuesta, no en la transacción.
  - Dos hechos calculados: **presupuesto de la categoría** (cuánto queda del mes antes y después; "sin presupuesto" si no hay) y **dinero disponible después** de la compra, con el nuevo monto por día.
  - Acciones: **Registrar gasto** (continúa el guardado normal), **Pensarlo** (10 min / 24 h → compra pospuesta) y **Volver** (regresa al formulario sin perder datos).
  - Ajustes → "Compra consciente": interruptor y umbral (`MoneyInput`).
  - Función pura `evaluateMindfulPurchase` con tests.
- No incluye:
  - Marcar categorías como esenciales, listas de deseos, metas de ahorro o límites duros.
  - Notificaciones, recordatorios push o correo.
  - Reglas de obligaciones o cuotas (siguen fuera, como en 009a).
  - El dashboard de compras evitadas (010a) ni el resumen semanal (010b).

## Reglas

- Condición de aparición: función `shouldAsk` = activada ∧ tipo gasto ∧ creación ∧ importe ≥ umbral. La categoría de sistema "ajuste" nunca la dispara.
- **Efecto en el disponible:** si la cuenta es una tarjeta o una cuenta líquida incluida, el disponible baja por el importe. Si es una cuenta líquida **excluida** (reserva), el disponible no cambia y el texto dice "Sale de tu reserva".
- **Presupuesto:** gastado del mes de la fecha del gasto en esa categoría + el importe del gasto; se muestra restante, o "Te pasarías por S/ X" en tono neutro. Se reutiliza `getBudgetStatus` (spec 008).
- Disponible después = `computeAvailableMoney` con el saldo simulado; si queda negativo, texto calmado como en 009a (sin cifra por día).
- Dinero en céntimos enteros; formato con `formatPen`. La etiqueta "Estimado" acompaña al disponible, como en 009a.
- `userId` solo de Clerk; la configuración se valida con Zod en el servidor (umbral entero ≥ 0 en céntimos).
- La pausa no crea transacciones ni cambia saldos.

## Archivos (previstos)

- `src/db/schema/user-settings.table.ts` + `drizzle/0004_*.sql` (aditiva; se aplica a Neon **solo con tu OK**).
- `src/modules/mindful-purchase/`: `mindful-purchase.ts` (función pura) y su test, `schemas/`, `services/` (leer y guardar configuración), `actions/`, `hooks/use-mindful-settings.ts`, `components/mindful-purchase-step.tsx` y `mindful-settings-form.tsx`.
- `src/modules/transactions/components/transaction-form-dialog.tsx` y `hooks/use-transaction-form.ts`: insertan el paso antes del guardado.
- `src/modules/settings/settings-items.ts`: nuevo ítem "Compra consciente".
- Enlace con 010a para registrar la compra pospuesta.

## Criterios de aceptación

- AC1: con la función activada y umbral S/ 100, un gasto de S/ 99.99 se guarda directo y uno de S/ 100 abre el paso "Antes de registrar".
- AC2: ingresos, transferencias, pagos de tarjeta, ediciones y ajustes no abren el paso.
- AC3: "Registrar gasto" guarda el gasto sin responder nada; no hay ningún camino que impida guardarlo.
- AC4: el paso muestra el restante del presupuesto antes y después, o "Sin presupuesto" si no hay.
- AC5: el disponible mostrado coincide con el que mostraría 009a tras registrar la compra; en cuenta reservada no cambia y lo dice.
- AC6: "Pensarlo" no crea transacción ni cambia saldos, y deja la compra como pospuesta en 010a.
- AC7: "Volver" regresa al formulario con los datos intactos.
- AC8: desactivar la función en Ajustes hace que el formulario se comporte como hoy; el umbral se guarda y se aplica al siguiente gasto, y vale en otro dispositivo.
- AC9: textos neutros, sin lenguaje culpabilizador, y estados que no dependen solo del color. Controles de 44 px, sin scroll horizontal a 360, 768 y 1280 px, en claro y oscuro.
- AC10: `npm run lint`, `npm run test` y `npm run build` pasan; las pruebas existentes no cambian.

## Tests requeridos

- Unitarios de `shouldAsk` y `evaluateMindfulPurchase`: umbral exacto, tipos excluidos, categoría con y sin presupuesto, presupuesto excedido, cuenta tarjeta, cuenta líquida incluida y excluida, disponible negativo.
- Servicio de configuración con PGlite y migraciones reales: valores por defecto, guardado, aislamiento por `userId`.
- Componente y formulario (RTL): aparece o no según umbral, registrar, pensar y volver.
- Prueba en vivo en Neon con usuario temporal tras aplicar la migración.

## Preguntas abiertas

1. ¿Umbral por defecto de S/ 100, o prefieres otro valor?
2. ¿Confirmas la tabla `user_settings` (recomendada) en lugar de `localStorage`?
3. Esta spec depende de 010a para "Pensarlo". ¿Hacemos primero 010a, como indica el roadmap, o quieres que 010c funcione sin "Pensarlo" y se lo agregue después?
