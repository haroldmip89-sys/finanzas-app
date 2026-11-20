# Compra consciente

Estado: hecha (falta aplicar la migración 0005 a Neon)

## Objetivo

Ayudarte a decidir **antes** de comprar algo, sin estorbar y sin juzgar (BRIEF §5.3): una pantalla breve y opcional que muestra los hechos de tu situación y te deja elegir en un toque, y una pausa de reflexión para las compras grandes. Sus resultados alimentan las compras evitadas y pospuestas de la spec 010a.

Reglas del BRIEF que mandan sobre todo lo demás: **nunca bloquea una compra**, no exige respuestas para registrar un gasto, no muestra advertencias constantes, sin mensajes culpabilizadores, es configurable y se puede desactivar.

Referencias: `docs/BRIEF.md §5.3, §11 (decisión 5)`, specs 008 (presupuestos), 009a (dinero disponible), 010a (compras evitadas).

## Cómo funciona

1. **"Evaluar una compra"** es una nueva opción del menú "+" (junto a gasto, ingreso y transferencia). Pide el **monto** y, opcionalmente, la **categoría**.
2. Muestra tres hechos, en tono neutro, que responden las tres preguntas del BRIEF:
   - **¿Está dentro del presupuesto?** Si la categoría tiene presupuesto este mes: lo que te queda y cómo quedaría después ("Te quedarían S/ 40 en Ropa" o "Te pasarías S/ 25 de tu presupuesto de Ropa"). Sin presupuesto o sin categoría: no se muestra.
   - **¿Puedo pagarla?** Compara el monto con tu dinero **sin asignar** (si hay presupuestos) o con tu dinero disponible (si no), ambos estimados: "Te quedarían S/ 310 sin asignar" o "Supera tu dinero sin asignar en S/ 90".
   - **¿Es necesaria?** Una pregunta opcional con dos toques ("Es necesaria" / "Puede esperar"); no hace falta contestarla.
3. Tres salidas, siempre habilitadas:
   - **La compraré:** abre el formulario de gasto con el monto y la categoría ya puestos.
   - **No la compraré:** crea una **compra evitada** (010a) con esos datos, en un toque.
   - **Pensarlo:** crea una **compra pospuesta** (010a) con un recordatorio a los 10 minutos o a las 24 horas.
4. **Recordatorio:** sin notificaciones del sistema (no hay PWA todavía). Cuando vence el plazo, en **Inicio** aparece una tarjeta discreta: "Hace 24 h pensabas comprar *Zapatillas* (S/ 89.90). ¿Sigues queriéndola?" con **Sí, la compraré** (abre el formulario de gasto y retira la pospuesta) y **Ya no la quiero** (pasa a evitada). Se puede descartar y vuelve a verse en `/avoided`.
5. **Aviso en el formulario de gasto:** si registras un gasto nuevo de **más del umbral** configurado, aparece una línea discreta y descartable: "Es una compra grande para ti. ¿Quieres pensarla?" con el botón **Pensarlo**. No bloquea ni cambia el guardado; guardar sigue siendo un toque.

## Decisiones (con mi recomendación)

1. **Pantalla aparte en vez de interrumpir el registro.** Normalmente registras un gasto *después* de hacerlo, y frenarte ahí sería inútil y culpabilizante. Por eso la evaluación vive en su propia opción y el formulario de gasto solo recibe el aviso suave del punto 5.
2. **Umbral por defecto: S/ 100**, editable. Solo afecta al aviso del punto 5.
3. **Pausa:** el usuario elige 10 minutos o 24 horas al tocar "Pensarlo"; en Ajustes se configura cuál aparece marcada por defecto (recomiendo 24 h).
4. **Activada por defecto** y desactivable en Ajustes. Desactivada: desaparecen la opción del menú "+", el aviso del formulario y la tarjeta de recordatorio; los registros ya creados siguen en `/avoided`.
5. **Sin decidir por ti:** la pregunta de necesidad solo se guarda como motivo ("No lo necesito" / "Puedo esperar") cuando eliges "No la compraré" o "Pensarlo"; nunca cambia lo que se permite hacer.
6. **Datos que se usan:** dinero disponible (009a) y presupuestos del mes (008); sin cálculos nuevos de dinero.

## Alcance

- Incluye:
  - Tabla **`user_settings`** (una fila por usuario: `mindful_enabled`, `mindful_threshold_cents`, `mindful_pause_minutes` con valores permitidos 10 o 1440) y columna **`remind_at`** (fecha y hora, nula) en `avoided_purchases`: **migración 0005**, aditiva.
  - Función pura `evaluatePurchase` (hechos de presupuesto y de capacidad de pago) con sus textos.
  - Pantalla "Evaluar una compra" en hoja inferior (diálogo desde 640 px), con las tres salidas.
  - Opción en el menú "+" (y en el menú del escritorio), aviso del formulario de gasto y tarjeta de recordatorio en Inicio.
  - Ajustes: página "Compra consciente" con el interruptor, el umbral y la pausa por defecto.
  - Servicio, acciones y hooks de ajustes; el servicio de compras evitadas guarda `remind_at` en las pospuestas y lista las vencidas.
- No incluye:
  - Notificaciones del sistema, correos o sonidos (llegarán con una PWA).
  - Detección automática de compras ni bloqueo de ninguna clase.
  - Cambios en saldos, transacciones o presupuestos; evaluar o pensar una compra **no crea movimientos financieros**.

## Reglas

- Importes en céntimos; hechos siempre marcados como estimados cuando dependen del dinero disponible.
- Lenguaje neutro y de hechos ("Te quedarían…", "Supera…"), sin órdenes ni reproches.
- `remind_at` solo en compras pospuestas; al pasar a evitada o al eliminar, se pierde. El plazo se calcula en el servidor a partir de la hora actual.
- `userId` solo de Clerk; validación con Zod; el servicio filtra por `userId`. Las acciones nuevas entran solas en el test de protección de acciones (spec 010).
- Sin ajustes guardados, se usan los valores por defecto (activada, S/ 100, 24 h): una fila se crea al guardar por primera vez.

## Archivos (previstos)

- `src/db/schema/user-settings.table.ts`, `avoided-purchases.table.ts` y `drizzle/0005_*.sql` (se aplica a Neon **solo con tu OK**).
- `src/modules/mindful-purchase/` (nuevo): `evaluate-purchase.ts`, `schemas/`, `services/settings.service.ts`, `actions/`, `hooks/`, `components/` (`evaluate-purchase-dialog`, `purchase-facts`, `reminder-card`, `large-purchase-hint`).
- `src/modules/avoided-purchases/` (servicio y acciones: `remind_at`, lista de vencidas).
- `src/modules/quick-add/` (opción nueva en el menú "+") y `src/modules/transactions/components/transaction-form-dialog.tsx` (aviso).
- `src/modules/settings/` y `src/app/(app)/settings/mindful/…` (página de configuración), `src/modules/dashboard/components/dashboard-page.tsx` (tarjeta de recordatorio).
- `docs/BRIEF.md` (estado).

## Criterios de aceptación

- AC1: "Evaluar una compra" muestra los hechos de presupuesto y de capacidad de pago con el monto y la categoría elegidos, y las tres salidas están siempre disponibles.
- AC2: "No la compraré" crea una compra evitada y "Pensarlo" una pospuesta con recordatorio a 10 minutos o 24 horas; ninguna crea transacciones ni cambia saldos o presupuestos.
- AC3: "La compraré" abre el formulario de gasto con monto y categoría precargados.
- AC4: cuando vence el plazo, Inicio muestra la tarjeta de recordatorio; "Sí, la compraré" retira la pospuesta y abre el gasto, y "Ya no la quiero" la pasa a evitada.
- AC5: un gasto nuevo por encima del umbral muestra el aviso descartable; guardar no cambia ni se retrasa, y editar un gasto no muestra el aviso.
- AC6: en Ajustes se puede activar o desactivar la función, cambiar el umbral y la pausa por defecto; desactivada, no aparece nada de lo nuevo.
- AC7: ningún texto culpabiliza ni ordena; sin presupuesto o sin categoría el hecho de presupuesto no se muestra.
- AC8: se ve bien a 360, 768 y 1280 px, en claro y oscuro, con estados de carga y error con "Reintentar".
- AC9: cada usuario solo ve y cambia sus propios ajustes y recordatorios.
- AC10: `npm run lint`, `npm run test` y `npm run build` pasan; los tests existentes no cambian de comportamiento (salvo el del menú "+" si cuenta sus opciones, y se avisa).

## Tests requeridos

- `evaluatePurchase`: dentro y fuera de presupuesto, sin presupuesto, sin categoría, con y sin presupuestos para el "sin asignar", disponible negativo, redondeos.
- Esquemas y servicio de ajustes (PGlite con migraciones reales): valores por defecto, guardar, rangos del umbral, pausa permitida solo 10 o 1440, aislamiento por `userId`.
- Compras evitadas: `remind_at` solo en pospuestas, se borra al pasar a evitada, lista de vencidas (límite y orden) con reloj controlado.
- Restricciones de base: `mindful_pause_minutes` solo 10 o 1440, umbral positivo, `remind_at` coherente con el estado.
- Componentes: evaluación (hechos y salidas), aviso del formulario (umbral, solo gasto nuevo, descartable), tarjeta de recordatorio, página de ajustes, opción del menú "+" según el interruptor.
- Prueba en vivo en Neon con usuario temporal (datos borrados después), tras aplicar la migración.

## Orden de implementación

1. Función pura y sus tests.
2. Esquema, migración 0005 y restricciones (pido tu OK antes de aplicarla).
3. Servicios, acciones y hooks (ajustes y recordatorios).
4. Pantalla "Evaluar una compra", opción del menú "+" y aviso del formulario.
5. Página de Ajustes y tarjeta de recordatorio en Inicio.
6. Lint, tests, build, prueba en vivo y verificación visual.

## Preguntas abiertas

1. **Umbral por defecto:** ¿S/ 100? (Recomendado; se puede cambiar en Ajustes.)
2. **Pausa por defecto:** ¿24 horas marcada y 10 minutos como alternativa? (Recomendado.)
3. **Activada por defecto:** ¿sí? (Recomendado: así la ves funcionar, y se apaga en un toque.)
4. **Revisión:** toca datos de usuario pero no dinero ni autenticación; propongo no usar el agente `reviewer`.

## Próximas fases

- 010b: resumen semanal, que incluirá compras evitadas y pospuestas.
- 011: PWA, que permitirá notificaciones reales de los recordatorios.

## Notas de implementación

- Migración `drizzle/0005_yellow_iceman.sql` (tabla `user_settings` y columna `avoided_purchases.remind_at`). **Pendiente de aplicar a Neon**: hasta entonces la página de compras evitadas y los ajustes fallan al cargar (el listado ya pide `remind_at`).
- Los hechos de la pantalla "Evaluar una compra" salen de datos que el cliente ya tiene (`useAccounts`, `useBudgets`, `useCategories`) con la función pura `evaluatePurchase`; no hay servicio nuevo para eso. Hay servicio solo para ajustes (`user_settings`) y para los recordatorios (`listDue`, `dismissReminder`, `remind_at` al crear o editar).
- Mientras los ajustes no se conocen, la función cuenta como apagada: nada aparece de golpe a quien la desactivó.
- Menú "+": nueva opción "Evaluar una compra" (solo si está activada). Aviso del formulario de gasto: `LargePurchaseHint`, solo en gastos nuevos de más del umbral; no cambia el guardado.
- "Sí, la compraré" elimina la pospuesta al tocar y abre el gasto precargado; "Ya no la quiero" la pasa a evitada; "Más tarde" solo borra el recordatorio. Los recordatorios se vuelven a consultar cada minuto con la app abierta (sin notificaciones del sistema).
- Página de configuración en `/mindful` (enlace en Ajustes, que queda resaltado en esa ruta); `/mindful` en `robots.txt`.
- Los textos de los hechos son neutros ("Te quedarían…", "Supera…") y un test comprueba que no contienen órdenes ni reproches.
- Tests existentes: `quick-add.test.tsx` y `dashboard-page.test.tsx` ganaron mocks de los ajustes y del presupuesto; ninguna aserción previa cambió.
- Verificado en navegador con página temporal (borrada) a 360 px en oscuro: tarjeta de recordatorio, página de ajustes y hoja "Evaluar una compra" con hechos reales. No visto en claro ni a 768 y 1280 px.
