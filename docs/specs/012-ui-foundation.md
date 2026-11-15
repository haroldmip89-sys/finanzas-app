# Base visual Yupi! (implementación del diseño)

Estado: hecha (falta tu revisión manual con sesión, AC11)

## Objetivo

Aplicar a la app el **sistema visual Yupi!** diseñado con Artifact Design (violeta sereno, superficies azuladas, colores semánticos para el dinero), **sin cambiar el comportamiento**: ni reglas de negocio, ni datos, ni hooks, ni rutas. Se hace antes del dashboard (009) para que nazca con el estilo nuevo. Se sigue el diseño con fidelidad en tokens, componentes y estructura de pantallas; no hace falta que cada píxel sea idéntico.

Referencias:

- Diseño: https://claude.ai/artifact/5xiYtwn7ZZxMicKzg2NSRJ (16 artboards, `project/*.dc.html`).
- Entrega en el repo: `docs/design/handoff/README.md` (reglas) y `docs/design/handoff/yupi-tokens.css` (tokens listos para pegar).
- Icono y nombre de marca: `docs/design/63692.png`, `src/lib/site.ts` (hecho).
- Reglas de código: `docs/SETUP.md §2`.

## Diseño recibido

Versión del canvas `1794741421-421a`. Contenido:

| Artboard | Qué define |
|---|---|
| Fundamentos | Tokens OKLCH y hex con contraste (claro y oscuro), escala tipográfica, espaciado, radios, sombras, movimiento, accesibilidad |
| Componentes | Botón, campos, select/menú/switch, pestañas, etiquetas, tarjeta de recurso, tarjeta de cifra, progreso, cabecera y paginación, vacío/error/toast/esqueleto, navegación |
| Móvil 360 (oscuro) | Login, Inicio, Movimientos, Cuentas, Categorías y Ajustes, Presupuestos |
| Formularios | Nueva transacción (bottom sheet), transferencia, pagar tarjeta, calibrar saldo, nueva cuenta, nueva categoría |
| Estados | Carga, vacío, error y toast |
| Tema claro | Inicio, Movimientos, Cuentas y Nueva transacción en claro |
| Escritorio 1280 / tablet 768 | Login, Inicio, Movimientos, Cuentas |

Puntos del diseño que **ya existen en la app** y solo se restilan: login con carrusel, Movimientos con pestañas Transacciones/Transferencias, Cuentas con tarjetas de crédito y menú de acciones, Categorías, Ajustes, bottom sheets, Presupuestos (spec 008, ruta `/analysis`).

Puntos del diseño que **todavía no existen** y quedan fuera (se implementan en su spec con este sistema visual): "Dinero disponible" y "¿Cómo se calculó?" (009a), "Próximas obligaciones", "Comportamiento de consumo", "Compras impulsivas evitadas" y gráfico de gastos por categoría (009 / P1). En Inicio solo se restila lo que hoy existe (acciones rápidas y lo que haya) dejando la estructura lista.

## Alcance

- Incluye:
  - Tokens de `docs/design/handoff/yupi-tokens.css` en `src/app/globals.css` (claro y oscuro), con los tokens nuevos (`income`, `expense`, `debt`, `warning`, `success`, `info` y sus `-foreground`) expuestos a Tailwind; `--radius: 0.875rem`; `tabular-nums` en `body`.
  - Escala tipográfica del diseño aplicada con clases (sin tokens nuevos de fuente: Plus Jakarta Sans y Geist Mono ya cargadas).
  - Restilado de `src/components/ui/*` y `src/components/shared/*`: botón (default `h-11`, `active:scale-[.97]`, estado cargando), campos `h-11 rounded-xl`, tabs (segmentado y subrayado), badges (incluye "Estimado" punteado y "Ajuste"), tarjeta de recurso, tarjeta de cifra, barra de progreso con estados, diálogo y bottom sheet, toast, esqueleto, vacío, error.
  - Navegación: barra inferior de 5 posiciones con FAB central, menú lateral (≥1024 px), rail (768 px), barra superior, enlace "Saltar al contenido".
  - Pantallas existentes: login/registro, Inicio, Movimientos (ambas pestañas), Cuentas, Categorías, Ajustes, Presupuestos y todos los formularios, diálogos y bottom sheets.
  - Importes: signo siempre, gastos en `foreground`, ingresos en `income`, deuda en `debt`, ajustes con badge; `aria-label` tipo "Gasto de 18.50 soles".
  - Movimiento con versión `prefers-reduced-motion` según la tabla del diseño.
  - Componentes de Clerk con el tema (variables; si no aceptan `oklch()`, los hex del handoff).
- No incluye:
  - Cambiar arquitectura de información, textos funcionales, reglas o lógica.
  - Construir dinero disponible, obligaciones, consumo, compras evitadas ni gráficos (specs propias).
  - Librerías nuevas de íconos, gráficos o animación (se sigue con `lucide-react`; los íconos del diseño son equivalentes).
  - Cambios en base de datos, servicios, acciones, hooks o esquema.

## Decisiones tomadas (con mi recomendación; cambian si me indicas otra)

1. **Logotipo:** se usa el icono real `63692.png` ("Yupi!") en login y menú lateral, en vez del isotipo provisional "Y!". Nombre de marca "Yupi!".
2. **Teclado del monto:** teclado del sistema con `inputmode="decimal"` (como propone el diseño y ya hace `MoneyInput`).
3. **Umbrales de presupuesto:** hoy la app usa su propia lógica (spec 008); se **mantiene** y solo cambian los colores a `success` / `warning` / `expense`. Cualquier cambio de umbral va aparte.
4. **Fórmula de dinero disponible:** no se implementa aquí; se confirma en 009a.
5. **Imágenes del carrusel de login:** se mantienen las 3 provisionales.
6. **Altura del botón:** `h-11` en móvil y `h-10` desde `md`, según la propuesta del diseño.
7. **Deuda (rosa) vs gasto (coral):** se acepta el diseño; la deuda siempre lleva además la palabra "Deuda".
8. **Navegación móvil (decisión tuya, ver abajo):** el diseño usa 5 posiciones (Inicio, Movimientos, "+", Cuentas, Ajustes). La app hoy tiene Presupuestos (`/analysis`) como 4.º destino y Ajustes aparte. Recomendación: **seguir el diseño** (Ajustes en la barra) y llegar a Presupuestos desde una tarjeta "Presupuesto" en Inicio y desde el menú lateral de escritorio (4.º destino); Categorías sigue colgando de Ajustes.

## Reglas de implementación

- Los colores solo viven como variables en `globals.css`; los componentes usan clases semánticas. No se añaden colores fijos. Fondos suaves con opacidad (`bg-income/15` en oscuro, `/12` en claro).
- Los componentes se restilan **sin cambiar props ni API pública**, para que hooks y tests sigan funcionando.
- Orden: tokens → tipografía → `ui` → `shared` → navegación → pantallas → estados y movimiento. Cada paso se verifica antes del siguiente.
- Cada pantalla se compara con el diseño a 360, 768 y 1280 px, en claro y oscuro, usando la técnica de página temporal (se borra después).
- En cuadrículas, `min-w-0` en los elementos con texto largo; los íconos pasan de servidor a cliente como elementos ya renderizados.
- Todo cambio a un archivo de shadcn en `src/components/ui/*` se hace a mano y se anota al final de esta spec.

## Archivos (previstos)

- `src/app/globals.css`, `src/app/layout.tsx` (solo si cambian clases globales o `viewport.themeColor`).
- `src/components/ui/*`, `src/components/shared/*`.
- `src/modules/shell/*` (barra inferior, menú lateral, rail, barra superior, `nav-items.ts`), `src/modules/quick-add/components/*`.
- Componentes de presentación de `auth`, `accounts`, `categories`, `transactions`, `transfers`, `calibration`, `budgets`, `settings` (solo clases y estructura visual).
- `docs/BRIEF.md` (estado del roadmap).

## Criterios de aceptación

- AC1: los tokens de `globals.css` coinciden con `yupi-tokens.css` en claro y oscuro, incluidos los semánticos nuevos; no hay colores fijos en componentes (búsqueda de hex, `rgb(` y paletas de Tailwind).
- AC2: contraste AA en ambos temas con los valores finales (los del handoff ya lo cumplen; excepciones documentadas: `--border` decorativo y `chart-2/3` claros con leyenda).
- AC3: cada componente `ui` y `shared` implementa normal, hover, foco visible, activo, deshabilitado, cargando y error donde aplique.
- AC4: cada pantalla coincide con el diseño a 360, 768 y 1280 px, claro y oscuro, sin scroll horizontal y con destinos táctiles ≥ 44 px.
- AC5: navegación (barra inferior con FAB, menú lateral, rail, barra superior, pestañas de Movimientos) y bottom sheets respetan el diseño y el área segura; desde 640 px el sheet es diálogo.
- AC6: importes con cifras tabulares, formato `S/ 1,234.50`, signo y `aria-label`; ingreso, gasto, deuda, saldo a favor y ajuste se distinguen por token y también por texto o signo.
- AC7: con `prefers-reduced-motion` las transiciones se reducen según la tabla del diseño.
- AC8: login, registro y menú de usuario de Clerk coherentes con el tema en claro y oscuro.
- AC9: no cambia comportamiento: los tests existentes pasan sin modificarse (salvo selectores de texto si un texto cambia con tu aprobación); no se tocan servicios, acciones, hooks ni esquema.
- AC10: `npm run lint`, `npm run test` y `npm run build` pasan.
- AC11 (manual, con sesión): recorrido en móvil y escritorio, claro y oscuro: gasto desde "+", transferencia, pago de tarjeta, calibración, filtrar movimientos, Ajustes, Categorías y Presupuestos.

## Tests requeridos

- Los tests existentes (547 al último recuento) siguen pasando: son la red de seguridad.
- Test ligero que lee `globals.css` y comprueba que `:root` y `.dark` definen el mismo conjunto de tokens, incluidos los semánticos nuevos.
- Test de `nav-items` actualizado si cambia la lista de destinos (decisión 8).
- Lo visual y el contraste se verifican en navegador con páginas temporales; la parte con sesión la revisas tú.

## Tandas de implementación

1. **Tanda 1 – base:** tokens, tipografía, `ui` y `shared`. Cambia toda la app a la vez; se revisa antes de seguir.
2. **Tanda 2 – navegación y sheets:** barra inferior con FAB, menú lateral, rail, barra superior, bottom sheet/diálogo, toasts.
3. **Tanda 3 – pantallas:** login/registro, Inicio, Movimientos, Cuentas, luego Categorías, Ajustes y Presupuestos, y todos los formularios.
4. **Tanda 4 – estados y pulido:** carga, vacío, error, movimiento reducido, Clerk, lint/test/build.

## Preguntas abiertas

1. **Navegación móvil (decisión 8):** ¿sigo el diseño (Ajustes en la barra, Presupuestos desde Inicio y menú lateral) o prefieres mantener Presupuestos como destino de la barra?
2. **Revisión:** la spec no toca dinero ni datos; propongo no usar el `reviewer`.

## Próximas fases

- 009a / 009: dinero disponible y dashboard, ya con este sistema visual.
- 011: PWA (iconos y color de tema del sistema visual).

## Notas de implementación

- Archivos de shadcn editados a mano: `button`, `input`, `badge` (variantes `income`, `expense`, `debt`, `warning`, `success`, `info`), `tabs`, `dialog` (asa del sheet, sheet hasta 640 px, "Cerrar"), `select`, `dropdown-menu`, `switch`, `skeleton`, `alert`, `sonner`. La CLI no debe sobrescribirlos.
- Nuevo: `BrandLogo`, `public/yupi-logo.png`, enlace "Saltar al contenido", `ProgressBar` con tonos `success` / `warning` / `over` (gasto en `expense`), test de tokens `src/app/globals.test.ts`.
- Un test existente cambió de assert (progress-bar: token `bg-expense` en vez de `bg-destructive`, por el diseño) y se añadió otro de estados.
- Navegación móvil: 5 posiciones; Presupuestos se alcanza desde Inicio (tarjeta) y el menú lateral.
- Verificado en navegador con página temporal (borrada): 360 px y 1280 px, oscuro y claro. Sin verificar: pantallas con sesión, 768 px, bottom sheets abiertos, componentes de Clerk.
