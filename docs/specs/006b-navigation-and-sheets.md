# Navegación simplificada y formularios como bottom sheet

Estado: hecha

## Objetivo

Aplicar dos pedidos del Brief v0.2 (`docs/BRIEF.md §5.4 y §6`): una navegación principal más corta, para que la barra inferior móvil no se sature, y formularios que en móvil se abren como **bottom sheet** (panel que sube desde abajo, a lo ancho de la pantalla) en lugar de un diálogo centrado. No cambia reglas de negocio, datos ni rutas existentes.

## Alcance

- Incluye:
  - Menú principal con tres destinos hoy: **Inicio**, **Movimientos** y **Cuentas** (un cuarto, **Análisis**, llega con la spec 008).
  - **Movimientos** agrupa Transacciones y Transferencias con una tira de pestañas; las URLs `/transactions` y `/transfers` no cambian.
  - **Ajustes** (`/settings`) como centro de configuración, con acceso a Categorías; se llega desde un icono de engranaje en la barra superior móvil y desde un enlace al pie del menú lateral en escritorio.
  - Los formularios de transacción, transferencia, cuenta y categoría se abren como bottom sheet por debajo de 768 px y siguen siendo diálogos centrados desde 768 px.
- No incluye:
  - La página y la sección **Análisis** (se crea con presupuestos, spec 008).
  - Gesto de arrastrar hacia abajo para cerrar el sheet (se cierra con la X, tocando fuera o con Escape).
  - Nuevas dependencias.
  - Cambiar el comportamiento del botón "+", de los formularios o de los saldos.
  - Mover rutas: `/categories` y `/transfers` conservan su URL.

## Diseño

Navegación (`src/modules/shell/nav-items.ts`):

- Tres destinos principales: Inicio (`/dashboard`), Movimientos (`/transactions`) y Cuentas (`/accounts`). Se elimina `shortLabel`, que ya no hace falta con tres etiquetas cortas.
- Cada destino puede declarar rutas adicionales que lo marcan como activo (`matches`): Movimientos incluye `/transfers`. Ajustes es un destino aparte y no entra en la barra inferior; se activa en `/settings` y `/categories`.
- La barra inferior, el menú lateral y el botón flotante siguen igual; el flotante se mantiene por encima de la barra.

Movimientos:

- `src/app/(app)/(movements)/layout.tsx` (grupo de rutas: no cambia la URL) muestra la tira de pestañas **Transacciones | Transferencias** sobre ambas páginas. Las carpetas `transactions/` y `transfers/` se mueven dentro del grupo con todo su contenido (`page`, `loading`, `error`).
- Las pestañas son enlaces con `aria-current="page"`, con destino táctil de 44 px.

Ajustes:

- `/settings` lista los apartados disponibles como tarjetas enlazadas; hoy solo **Categorías**. Es el lugar para futuras configuraciones (reservas, período de planificación, compra consciente).
- Acceso: engranaje en la barra superior móvil (44 px, con nombre accesible "Ajustes") y enlace "Ajustes" al pie del menú lateral, encima del usuario y del tema.
- `/categories` sigue funcionando por URL directa.

Bottom sheet (`src/components/ui/dialog.tsx`, componente de shadcn ya modificado en el proyecto):

- `DialogContent` recibe una opción `sheet`. Con ella, por debajo de 768 px el panel queda anclado abajo, a todo el ancho, con esquinas superiores redondeadas, `max-h-[92dvh]` con desplazamiento interno, relleno inferior que respeta `env(safe-area-inset-bottom)` y animación de subida; desde 768 px conserva el diálogo centrado de siempre.
- Se usa en los formularios de transacción, transferencia, cuenta y categoría. `ConfirmDialog` sigue centrado.
- Limitación conocida: `dvh` no descuenta el teclado virtual en todos los navegadores móviles; se verifica a mano que los campos queden visibles al escribir.

## Reutilizar

- `NavLink`, `isActive`, `AppSidebar`, `TopBar`, `BottomNav`, `QuickAddFab` y la lista `navItems`.
- `ResourceCard` o un enlace con el estilo de `buttonVariants` para las tarjetas de Ajustes.
- `PageHeader` en Ajustes; el patrón de `loading.tsx` y `error.tsx` de las demás rutas.
- Iconos de `lucide-react` (`Settings`, `Home`/`LayoutDashboard`, `Receipt`, `Wallet`, `Tags`).

## Archivos

Nuevos:

- `src/app/(app)/(movements)/layout.tsx`
- `src/modules/shell/components/movements-tabs.tsx` (+ test)
- `src/app/(app)/settings/page.tsx`, `loading.tsx`, `error.tsx`
- `src/modules/settings/components/settings-page.tsx`, `settings-items.ts`

Movidos (sin cambios de contenido):

- `src/app/(app)/transactions/*` y `src/app/(app)/transfers/*` hacia `src/app/(app)/(movements)/`.

Modificados:

- `src/modules/shell/nav-items.ts` (+ test): tres destinos, `matches`, destino de Ajustes.
- `src/modules/shell/components/nav-link.tsx`, `bottom-nav.tsx`, `app-sidebar.tsx`, `top-bar.tsx`
- `src/components/ui/dialog.tsx`: opción `sheet`.
- `src/modules/transactions/components/transaction-form-dialog.tsx`, `src/modules/transfers/components/transfer-form-dialog.tsx`, `src/modules/accounts/components/account-form-dialog.tsx`, `src/modules/categories/components/category-form-dialog.tsx`
- `docs/architecture/system-design.md` (módulo `settings` en `§4`).

## Criterios de aceptación

- AC1: la barra inferior móvil y el menú lateral muestran Inicio, Movimientos y Cuentas; Transferencias y Categorías ya no están en ellos.
- AC2: `/transactions` y `/transfers` muestran las pestañas Transacciones y Transferencias; la activa se resalta y tiene `aria-current="page"`; ambas conservan su comportamiento y su URL.
- AC3: "Movimientos" aparece activo tanto en `/transactions` como en `/transfers` (y en subrutas).
- AC4: desde móvil se llega a Ajustes con el engranaje de la barra superior y desde escritorio con el enlace del menú lateral; Ajustes muestra Categorías y lleva a `/categories`.
- AC5: "Ajustes" se resalta en `/settings` y en `/categories`; ninguna entrada principal se resalta por error.
- AC6: por debajo de 768 px los formularios de transacción, transferencia, cuenta y categoría se abren como bottom sheet (anclado abajo, a todo el ancho, esquinas superiores redondeadas, máximo 92 % de la altura con desplazamiento interno, sin quedar bajo el área segura del teléfono) y se cierran con la X, tocando fuera o con Escape.
- AC7: desde 768 px esos formularios siguen siendo diálogos centrados; `ConfirmDialog` es centrado en ambos tamaños.
- AC8: el botón "+", las acciones rápidas del inicio y las listas funcionan como antes; los enlaces directos a `/dashboard`, `/transactions`, `/transfers`, `/accounts` y `/categories` siguen funcionando.
- AC9: destinos táctiles de al menos 44 px; sin scroll horizontal a 360, 768 y 1280 px; claro y oscuro con solo tokens.
- AC10: el layout de servidor no pasa funciones ni componentes a clientes (los iconos se pasan como elementos ya renderizados).
- AC11: `npm run lint`, `npm run test` y `npm run build` pasan.
- AC12 (manual, con sesión): el flujo completo funciona en móvil y en escritorio, incluido escribir en un formulario con el teclado abierto.

## Tests requeridos

(Vitest + RTL, junto al archivo)

- `nav-items.test.ts` (ampliado): `isActive` con rutas adicionales (`/transfers` activa Movimientos, `/categories` activa Ajustes), sin coincidencias por prefijo parcial (`/transferencias-x` no activa nada) y la lista de destinos principales no incluye Transferencias ni Categorías.
- `movements-tabs.test.tsx`: con `usePathname` simulado, la pestaña de `/transactions` queda activa en esa ruta, la de `/transfers` en la suya, y solo una lleva `aria-current`.
- Componentes presentacionales (`settings-page`, barras, sheet): sin test unitario; se verifican en el navegador. La prueba de integración de `quick-add` existente debe seguir pasando sin cambios.

## Orden de implementación

1. `nav-items` (con test), `NavLink`, barra inferior, menú lateral y barra superior.
2. Grupo de rutas `(movements)` con las pestañas, moviendo `transactions/` y `transfers/`.
3. Ajustes: página, lista de apartados y accesos.
4. Opción `sheet` en `DialogContent` y su uso en los cuatro formularios.
5. Lint, tests, build y verificación en el navegador (con la técnica de página temporal para el tamaño de 360 px).

## Preguntas abiertas

1. **Análisis.** Hoy habría solo tres destinos. Se propone crear Análisis con la spec 008 (presupuestos) para no mostrar una página vacía. Alternativa: crearla ya con un mensaje de "próximamente", que no recomiendo.
2. **Cerrar el sheet arrastrando.** No se incluye: requiere manejar gestos o una librería de drawer. Se puede revisar en el rediseño (spec 012).
3. **Ajustes también en el menú de usuario de Clerk.** Se puede añadir un enlace, pero hoy bastan el engranaje y el menú lateral. ¿Lo agrego?
4. **Calibrar saldos.** Se propone que viva en cada cuenta, dentro de Cuentas (spec 007).

## Próximas fases

- 007: calibración de saldos (en Cuentas). 007a: tarjetas de crédito. 008: presupuestos, con la sección Análisis.
