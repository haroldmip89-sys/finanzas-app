# Base visual (implementación del diseño del artifact)

Estado: borrador

## Objetivo

Aplicar a la app un **sistema visual propio** (colores, tipografía, espaciado, componentes y pantallas) diseñado fuera del repositorio con Artifact Design, **sin cambiar el comportamiento**: ni reglas de negocio, ni datos, ni hooks, ni rutas. Es la primera fase de la spec 012 del roadmap (`docs/BRIEF.md §10`) y se hace antes de presupuestos y dashboard para que esas pantallas nazcan ya con el estilo nuevo.

Esta spec se escribió **antes** del diseño, así que define el proceso, las entradas que espera, los límites y cómo se verifica. Cuando llegue el diseño, se completa la sección "Diseño recibido" y se pasa a aprobación; recién entonces se implementa.

Referencias: `docs/design/artifact-design-prompt.md` (lo que se le pidió al diseñador), `docs/BRIEF.md §3, §8, §14`, `docs/SETUP.md §2` (tokens semánticos, sin colores fijos).

## Entrada esperada del diseño (handoff)

El diseño se guarda en `docs/design/handoff/` o se entrega como enlace de un artifact publicado (que se lee con la herramienta de artifacts). Debe traer, según el prompt:

1. Tokens de color en OKLCH para `:root` y `.dark`, con los nombres de shadcn y los tokens nuevos propuestos (ingreso, gasto, advertencia, éxito, información), con la relación de contraste de cada par de uso.
2. Escala tipográfica (Plus Jakarta Sans fija), reglas de cifras tabulares, espaciado, radios y sombras.
3. Especificación de cada componente con todos sus estados.
4. Pantallas en 360, 768 y 1280 px, en claro y oscuro.
5. Movimiento (con versión de movimiento reducido), accesibilidad y decisiones abiertas.

Si falta algo de esto, se pide antes de implementar; no se inventa.

## Alcance

- Incluye:
  - Tokens de color, radios y sombras en `src/app/globals.css` (claro y oscuro), incluidos los tokens semánticos nuevos y la paleta de gráficos.
  - Escala tipográfica y reglas de cifras tabulares (clases o utilidades compartidas).
  - Restilado de los componentes de `src/components/ui/*` y de `src/components/shared/*` según el diseño.
  - Navegación: barra inferior, botón flotante "+", menú lateral, barra superior, pestañas de Movimientos.
  - Restilado de las pantallas existentes: login y registro, Inicio, Movimientos (transacciones y transferencias), Cuentas, Categorías, Ajustes y todos los formularios, diálogos y bottom sheets.
  - Estados de carga, vacío, error y toasts con el estilo nuevo.
  - Los componentes de Clerk siguen el tema (el tema `shadcn` de `@clerk/ui` lee los tokens).
- No incluye:
  - Cambiar la arquitectura de información, los textos funcionales, las reglas ni la lógica.
  - Construir presupuestos, dinero disponible, compras evitadas o el dashboard completo: se implementan en sus propias specs, usando el sistema visual de esta.
  - Cambiar la tipografía base ni el tema oscuro por defecto.
  - Librerías nuevas de íconos, gráficos o animación, salvo que el diseño las justifique y el usuario las apruebe.
  - Cambios en la base de datos o migraciones.

## Reglas de implementación

- Los colores solo viven como variables en `globals.css`; los componentes usan clases semánticas. No se añaden colores fijos.
- Los componentes se restilan **sin cambiar sus props ni su API pública**, para que los hooks y los tests existentes sigan funcionando. Si el diseño exige cambiar una API, se anota y se aprueba aparte.
- Orden de trabajo: tokens → tipografía → componentes `ui` → componentes `shared` → navegación → pantallas → pulido. Cada paso se verifica antes del siguiente.
- Las pantallas se comparan con el diseño a 360, 768 y 1280 px, en claro y oscuro.
- Lección ya aprendida: en cuadrículas, los elementos con texto largo necesitan `min-w-0` para que `truncate` funcione; los iconos pasan de servidor a cliente como elementos ya renderizados, no como componentes.
- Cualquier cambio de un archivo generado por shadcn (`src/components/ui/*`) se hace a mano y queda anotado en la spec, porque la CLI no lo vuelve a generar sin sobrescribir.

## Diseño recibido

(Se completa cuando llegue el artifact: enlace o carpeta, versión, decisiones abiertas resueltas y cualquier excepción aprobada.)

## Archivos (previstos)

- `src/app/globals.css`, `src/app/layout.tsx` (solo si cambian las fuentes o clases globales)
- `src/components/ui/*` y `src/components/shared/*` (restilado)
- `src/modules/shell/components/*`, `src/modules/quick-add/components/*` (navegación y botón flotante)
- Componentes de presentación de `accounts`, `categories`, `transactions`, `transfers`, `calibration`, `settings` y `auth` (solo clases y estructura visual)
- `docs/design/handoff/*` (el diseño recibido)
- `docs/BRIEF.md` (estado del roadmap) y `docs/architecture/system-design.md` solo si se añaden tokens que convenga documentar

## Criterios de aceptación

- AC1: los tokens de color de `globals.css` coinciden con los del diseño, en claro y oscuro, e incluyen los tokens semánticos nuevos; no hay colores fijos en componentes (se comprueba con una búsqueda de hex, `rgb(` y paletas de Tailwind).
- AC2: los pares de texto y fondo cumplen contraste AA (4.5:1 texto normal, 3:1 texto grande y componentes) en ambos temas, comprobados con una herramienta de contraste sobre los valores finales.
- AC3: cada componente de `ui` y `shared` implementa los estados del diseño (normal, hover, foco visible, activo, deshabilitado, cargando, error cuando aplique).
- AC4: cada pantalla coincide con el diseño a 360, 768 y 1280 px, en claro y oscuro, sin scroll horizontal y con destinos táctiles de al menos 44 px.
- AC5: la navegación (barra inferior, botón flotante, menú lateral, barra superior, pestañas de Movimientos) y los bottom sheets respetan el diseño y el área segura del teléfono.
- AC6: los importes usan cifras tabulares y el formato `S/ 1,234.50`; los ingresos, gastos, deuda, saldo a favor y ajustes se distinguen con los tokens semánticos y también por texto o signo, no solo por color.
- AC7: con `prefers-reduced-motion` las transiciones se reducen o desaparecen como indica el diseño.
- AC8: los componentes de Clerk (login, registro, menú de usuario) se ven coherentes con el tema, en claro y oscuro.
- AC9: **no cambia ningún comportamiento**: los tests existentes pasan sin modificarse (salvo selectores de texto si cambia un texto con aprobación), y no se tocan servicios, acciones, hooks ni esquema.
- AC10: `npm run lint`, `npm run test` y `npm run build` pasan.
- AC11 (manual, con sesión): recorrido completo en móvil y escritorio, en claro y oscuro: crear un gasto desde el botón "+", una transferencia, un pago de tarjeta y una calibración; filtrar movimientos; abrir Ajustes y Categorías.

## Tests requeridos

- Los tests existentes (452 al escribir esta spec) deben seguir pasando; son la red de seguridad de que no cambió el comportamiento.
- Prueba de integración existente de `quick-add` (formularios, botón flotante, menú): sin cambios.
- Comprobaciones automáticas ligeras si el diseño trae reglas verificables: por ejemplo, que `globals.css` defina todos los tokens que usan los componentes en `:root` y en `.dark` (un test que lee el CSS y compara conjuntos de nombres).
- Lo visual y el contraste se verifican manualmente con el navegador y la herramienta de contraste, con la técnica de página temporal para el ancho de 360 px.

## Orden de implementación

1. Recibir y revisar el diseño; completar "Diseño recibido" y las decisiones abiertas con el usuario; aprobación de esta spec.
2. Tokens, tipografía y utilidades.
3. Componentes `ui` y `shared`.
4. Navegación, botón flotante y bottom sheets.
5. Pantallas, una por una: login, Inicio, Movimientos, Cuentas, Categorías, Ajustes, formularios.
6. Estados (carga, vacío, error, toasts) y movimiento reducido.
7. Lint, tests, build, comprobación de contraste y recorrido manual.

## Preguntas abiertas

1. **¿Quién implementa qué?** Se propone que el diseñador entregue el artifact y yo lo implemente en el repositorio, pantalla por pantalla, con tu revisión en cada tanda.
2. **Alcance de la primera tanda.** Se propone empezar por tokens y componentes compartidos (cambian toda la app a la vez) y luego las pantallas en orden de uso: Inicio y registro rápido, Movimientos, Cuentas.
3. **Pantallas futuras** (dinero disponible, presupuestos, compras evitadas): se diseñan ahora, pero se implementan en sus specs.
4. **Revisión.** Esta spec no toca dinero ni datos; se propone no usar el `reviewer`.

## Próximas fases

- 008: presupuestos y 009a / 009: dinero disponible y dashboard, implementados ya con el sistema visual de esta spec.
- 011: PWA (iconos y colores de tema del sistema visual).
