# Acciones rápidas

Estado: hecha

## Objetivo

Registrar un gasto, un ingreso o una transferencia **en pocos toques desde cualquier pantalla**, pensado para usar la app en la calle con una mano. Hoy hay que ir a `/transactions` y abrir el formulario; esta spec lo acerca sin cambiar las reglas de negocio ni la base de datos. Ver ideas de UX en `docs/BRIEF.md §8`.

## Alcance

- Incluye:
  - Botón flotante "+" en móvil y botón "Nuevo" en el menú lateral de escritorio, que abren Nuevo gasto, Nuevo ingreso o Transferir desde cualquier pantalla autenticada.
  - Acciones rápidas en `/dashboard`: tres botones grandes (Nuevo gasto, Nuevo ingreso, Transferir). El botón "Calibrar saldos" se suma con la spec 007.
  - Módulo `src/modules/quick-add` que monta los diálogos una sola vez en el layout y expone `useQuickAdd()`.
  - Formulario de transacción más rápido: tipo preseleccionado, **última cuenta usada** recordada, **categorías más usadas como botones** y **"Guardar y agregar otro"**.
  - Confirmación con toast tras guardar (se añade `sonner`).
- No incluye:
  - Cambiar reglas de negocio, esquema o migraciones.
  - Calibrar saldos (spec 007), presupuestos (008) ni el resto del inicio (009).
  - Atajos de teclado, gestos largos o reconocimiento de voz.
  - Rediseño visual: lo hará la spec 012 con Artifact Design.

## Diseño

Botón rápido:

- Móvil (< 768 px): botón flotante circular de 56 px, abajo a la derecha y por encima de la barra inferior (respeta `env(safe-area-inset-bottom)`). Al tocarlo abre un menú con Nuevo gasto, Nuevo ingreso y Transferir. Se oculta en `/dashboard`, donde ya están los botones grandes.
- Escritorio (≥ 768 px): botón "Nuevo" en la parte superior del menú lateral con el mismo menú.
- Toda interacción con destinos táctiles de al menos 44 px.

`QuickAddProvider` (cliente) vive en `(app)/layout.tsx`, guarda qué diálogo está abierto y lo renderiza. `useQuickAdd()` expone `open("expense" | "income" | "transfer")` y `close()`. El layout sigue siendo un componente de servidor: el provider recibe solo `children`, sin funciones ni componentes como props.

Formulario de transacción (`useTransactionForm`):

- Recibe `defaultType` (por defecto `expense`).
- La cuenta inicial es la última usada, si sigue activa; si no, queda vacía. Se guarda en `localStorage` (`finanzas:last-account`) con `try/catch`: si no está disponible, la app funciona igual.
- Categorías más usadas: `transactionsService.frequentCategories(userId, type, limit = 6)` devuelve las categorías activas del tipo con más transacciones en los últimos 90 días (días en Lima); si hay menos de 6, completa con las demás activas por nombre. Se muestran como botones tipo radio, con icono, y un botón "Más" despliega el selector completo.
- "Guardar y agregar otro": guarda, muestra el toast y deja el formulario listo para la siguiente carga conservando tipo, cuenta y fecha, y limpiando monto, categoría y nota. "Guardar" cierra el diálogo, como hoy.
- Tras guardar, el toast dice, por ejemplo, "Gasto guardado · S/ 12.50", "Ingreso guardado · S/ 3,000.00" o "Transferencia guardada · S/ 200.00".

Reutilización: se usan `TransactionFormDialog` y `TransferFormDialog` ya existentes, que reciben nuevos props opcionales; `/transactions` y `/transfers` siguen funcionando igual con ellos.

## Reutilizar

- `TransactionFormDialog`, `TransferFormDialog`, `useTransactionForm`, `useTransferForm` y sus mutaciones (invalidan listas y saldos).
- Componentes: `ResourceCard`, `DropdownMenu`, `Button`, `EntitySelect`, `MoneyInput`.
- `getCategoryIcon` del módulo `categories`.
- Infraestructura: `runAction`, `unwrapResult`, `errorMessage`, `dates.ts`, `PGlite` para tests del servicio.
- shadcn: `sonner` (nuevo, se agrega con la CLI).

## Archivos

Nuevos:

- `src/modules/quick-add/hooks/use-quick-add.ts` (+ test), `components/quick-add-provider.tsx`, `quick-add-menu.tsx`, `quick-add-fab.tsx`, `quick-actions.tsx`
- `src/hooks/use-last-account.ts` (+ test)
- `src/modules/transactions/hooks/use-frequent-categories.ts`
- `src/modules/transactions/components/category-chips.tsx`
- `src/components/ui/sonner.tsx` (generado por shadcn)

Modificados:

- `package.json`, `package-lock.json` (`sonner`)
- `src/app/layout.tsx` (`Toaster`)
- `src/app/(app)/layout.tsx` (`QuickAddProvider` y `QuickAddFab`), `src/app/(app)/dashboard/page.tsx` (`QuickActions`)
- `src/modules/shell/components/app-sidebar.tsx` (botón "Nuevo")
- `src/lib/dates.ts` (+ test): `addDays("2026-11-15", -90)` sin corrimientos de zona horaria
- `src/modules/transactions/services/transactions.service.ts` (+ test): `frequentCategories`
- `src/modules/transactions/actions/transactions.actions.ts`: `listFrequentCategoriesAction`
- `src/modules/transactions/hooks/use-transaction-form.ts` (+ test), `components/transaction-form-dialog.tsx`
- `src/modules/transfers/components/transfer-form-dialog.tsx` y `hooks/use-transfer-form.ts`: toast al guardar
- `docs/architecture/system-design.md` ya incluye el módulo `quick-add` en `§4`.

## Criterios de aceptación

- AC1: desde cualquier pantalla autenticada (salvo `/dashboard`), el botón "+" en móvil y "Nuevo" en escritorio abren Nuevo gasto, Nuevo ingreso o Transferir sin navegar.
- AC2: `/dashboard` muestra los botones grandes Nuevo gasto, Nuevo ingreso y Transferir, y el botón flotante no aparece ahí.
- AC3: un gasto se registra en 3 toques: escribir el monto, tocar una categoría y guardar, con la cuenta ya preseleccionada tras el primer uso.
- AC4: la última cuenta usada se recuerda entre sesiones del navegador; si ya no existe o está archivada se ignora; sin `localStorage` la app funciona igual.
- AC5: las categorías más usadas del tipo elegido aparecen como botones (máximo 6, con icono), ordenadas por uso en los últimos 90 días, completadas con las demás por nombre; cambiar el tipo cambia los botones; "Más" muestra el selector completo.
- AC6: "Guardar y agregar otro" guarda, confirma con toast y deja el formulario con tipo, cuenta y fecha conservados y sin monto, categoría ni nota.
- AC7: tras guardar desde cualquier lugar, el toast confirma con el monto, y las listas y los saldos se actualizan sin recargar.
- AC8: los errores del servidor se muestran dentro del diálogo (por campo o generales) y el diálogo no se cierra.
- AC9: los diálogos se montan una sola vez en el layout; `/transactions` y `/transfers` conservan su comportamiento actual.
- AC10: responsive (360, 768, 1280 px, sin scroll horizontal) y funcional en claro y oscuro con solo tokens; el botón flotante no tapa la barra inferior ni el contenido, y respeta el área segura del teléfono.
- AC11: el layout de servidor no pasa funciones ni componentes a clientes; la lógica está en hooks.
- AC12: `npm run lint`, `npm run test` y `npm run build` pasan.
- AC13 (manual, con sesión): el flujo completo funciona en el navegador, en móvil y en escritorio.

## Tests requeridos

(Vitest; el servicio con PGlite y las migraciones reales)

- `dates.test.ts` (ampliado): `addDays` hacia atrás y adelante, cruces de mes y año, bisiestos.
- `transactions.service.test.ts` (ampliado): `frequentCategories` ordena por cantidad, respeta el tipo, excluye archivadas y las de otro usuario, ignora transacciones de hace más de 90 días, completa con las demás por nombre y devuelve como máximo `limit`.
- `use-last-account.test.ts`: lee y guarda, ignora valores inválidos, no falla si `localStorage` lanza error.
- `use-quick-add.test.tsx`: `open` y `close` por tipo, un solo diálogo abierto a la vez.
- `use-transaction-form.test.tsx` (ampliado): tipo inicial por `defaultType`, cuenta recordada solo si sigue activa, "Guardar y agregar otro" conserva y limpia lo indicado, el toast se invoca con el monto.
- Componentes presentacionales: sin test unitario; se verifican en el navegador.

## Orden de implementación

1. `addDays`, `frequentCategories`, acción y `use-frequent-categories`, con tests.
2. `use-last-account`, ajustes de `useTransactionForm`, `CategoryChips`, toasts y "Guardar y agregar otro".
3. `quick-add` (provider, menú, botón flotante, acciones rápidas), layout, sidebar y dashboard.
4. Lint, tests, build y verificación en el navegador.

## Preguntas abiertas

1. **Botón flotante.** Al tocarlo abre un menú de tres opciones (2 toques hasta el formulario). Alternativa: que abra directo "Nuevo gasto", que es lo más frecuente, y que el menú salga con un toque largo.
2. **Categorías como botones.** Se propone incluirlas. Es la parte más grande de la spec; si prefieres dejarla para el rediseño, se omite y el selector actual se mantiene.
3. **Toasts.** Se añade `sonner` (dependencia nueva) por la confirmación al guardar. Alternativa sin dependencia: un aviso simple propio.
4. **Revisión.** Spec sin reglas de dinero nuevas: no hace falta el `reviewer`.

## Próximas fases

- 007: calibrar saldos (suma el cuarto botón al inicio). 008: presupuestos. 009: inicio con saldos, últimos movimientos y gráficos.
