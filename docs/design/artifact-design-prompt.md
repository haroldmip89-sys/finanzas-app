# Prompt para el agente de diseño (Artifact Design)

Copia todo lo que está debajo de la línea y pégalo en el agente de diseño. Cuando te entregue el resultado, guárdalo en `docs/design/handoff/` (o pásame el enlace del artifact publicado) y sigue con la spec `docs/specs/012-ui-foundation.md`.

---

## Rol y objetivo

Eres un diseñador de producto y de interfaces. Diseña la **base visual** de "Finanzas", una aplicación web responsive de finanzas personales en soles peruanos (PEN). Quiero un sistema de diseño coherente (colores, tipografía, espaciado, componentes) y el diseño de las pantallas existentes y de las que vienen, que un desarrollador pueda implementar con Tailwind CSS v4 y shadcn/ui sin rehacer la lógica.

## Producto y usuario

- Uso personal de una sola persona, hoy, y multiusuario más adelante.
- Se usa sobre todo **en el celular, en la calle, con una mano y en pocos segundos** para registrar gastos; en escritorio se revisa con calma.
- Objetivo del producto: ayudar a decidir mejor con el mínimo esfuerzo. Debe responder: ¿cuánto puedo gastar de verdad?, ¿estoy gastando más de lo que debería?, ¿qué compras impulsivas puedo evitar?, ¿estoy dependiendo menos de las tarjetas?
- Tono: sereno, claro y motivador. **Nada de mensajes culpabilizadores**, alarmas ni urgencia artificial. El dinero disponible es el dato más importante; los saldos estimados nunca deben parecer confirmados.

## Restricciones técnicas (obligatorias)

- Tailwind CSS v4 con tokens en variables CSS (`:root` y `.dark`) en formato **OKLCH**, que se leen con clases semánticas (`bg-background`, `text-foreground`, `bg-card`, `border-border`, `text-muted-foreground`, `bg-primary`, `text-destructive`...). **Prohibido** usar colores fijos (hex, `zinc-500`, etc.) en los componentes.
- Componentes shadcn/ui estilo `base-nova` sobre Base UI (no Radix) y los íconos de `lucide-react`. No propongas librerías de íconos, de gráficos ni de animación nuevas sin justificarlas.
- Tipografía **fija**: Plus Jakarta Sans (texto) y Geist Mono (cifras o código, solo si hace falta). No cambies la fuente; define escala, pesos e interlineado. Usa cifras tabulares para importes.
- **Tema oscuro por defecto** y tema claro, con alternancia oscuro / claro / sistema. Diseña **ambos** con el mismo cuidado; el oscuro es el principal.
- Mobile-first: 360 px de ancho mínimo, y también 768 px y 1280 px. Sin scroll horizontal. Destinos táctiles de al menos 44 px. Contraste AA (texto normal 4.5:1, texto grande y componentes 3:1), foco visible y respeto de `prefers-reduced-motion`.
- Moneda: formato `S/ 1,234.50`. Idioma de la interfaz: español.
- Los formularios en móvil son **bottom sheets** (panel que sube desde abajo, a todo el ancho, esquinas superiores redondeadas, respeta el área segura del teléfono); en escritorio, diálogos centrados.

## Lo que NO debes cambiar

- La arquitectura de información: navegación principal de **3 destinos** (Inicio, Movimientos, Cuentas) más **Ajustes** aparte; Movimientos tiene pestañas Transacciones | Transferencias; botón "+" global.
- Los textos funcionales y las reglas (por ejemplo, "Deuda", "Saldo a favor", etiqueta "Ajuste").
- No agregues funciones nuevas ni pantallas fuera de la lista de abajo.

## Estado actual (para que sepas de dónde partes)

Hoy la interfaz usa la paleta neutra por defecto de shadcn (escala de grises, sin color de marca) y se ve genérica. Quiero identidad propia: una paleta con **un color de marca** sobrio, color semántico para ingresos, gastos, deuda, advertencias y éxito, y una paleta de 5 colores para gráficos, todos definidos para claro y oscuro.

## Pantallas que debes diseñar (móvil 360 px, tablet 768 px, escritorio 1280 px; claro y oscuro)

1. **Login / registro:** pantalla dividida desde 1024 px (carrusel de imágenes a la izquierda, formulario de Clerk a la derecha); solo formulario en móvil. Con marca "Finanzas" y selector de tema.
2. **Inicio (`/dashboard`):** cuatro acciones rápidas grandes (Nuevo gasto, Nuevo ingreso, Transferir, Calibrar saldos). Diseña también el **inicio completo futuro**, en este orden de importancia: **Dinero disponible** (cifra héroe con explicación desplegable de cómo se calculó y marca de "estimado"), próximas obligaciones, gastos del mes, deuda de tarjetas, presupuesto restante, comportamiento de consumo, compras impulsivas evitadas, últimos movimientos.
3. **Movimientos:** pestañas Transacciones | Transferencias; resumen del período (Ingresos, Gastos, Balance); filtros (plegables en móvil); lista paginada con filas que muestran icono de categoría, nombre, fecha, cuenta, nota, importe con signo y etiqueta "Ajuste" cuando corresponde.
4. **Cuentas:** tres cifras (Dinero líquido, Deuda de tarjetas, Compras con tarjeta este mes con su comparación con el mes pasado); sección Cuentas y sección Tarjetas de crédito; tarjetas de cuenta con saldo, o con "Deuda", "A favor" o "Sin deuda"; menú de acciones por tarjeta (Editar, Pagar tarjeta, Calibrar saldo, Archivar, Eliminar).
5. **Categorías** (con pestañas Gastos | Ingresos) y **Ajustes** (lista de apartados enlazados).
6. **Formularios como bottom sheet / diálogo:** Nueva transacción (selector Gasto | Ingreso, monto grande con teclado numérico, categorías más usadas como botones con "Más…", fecha, cuenta, nota, "Guardar" y "Guardar y agregar otro"), Nueva transferencia, Pagar tarjeta, Calibrar saldo (con vista previa de la diferencia) y formularios de cuenta y de categoría.
7. **Presupuestos** (futuro): lista por categoría con barra de avance (gastado frente a presupuestado), estados holgado / cerca del límite / excedido sin tono alarmista.
8. **Estados:** carga (esqueletos), vacío, error con reintento, y los avisos breves (toast) tras guardar.

## Componentes a especificar (todos sus estados)

Botón (primario, secundario, contorno, fantasma, destructivo, tamaños, deshabilitado, cargando), campo de texto, campo de monto, select, switch, pestañas, etiqueta/badge, tarjeta de recurso (icono, título, subtítulo, valor, menú), cabecera de página, estado vacío, mensaje de error, diálogo / bottom sheet, menú desplegable, barra de navegación inferior (con botón "+" flotante), menú lateral de escritorio, tira de pestañas de Movimientos, paginación, tarjeta de cifra (resumen), barra de progreso, toast, esqueleto.

## Formato de entrega (importante)

Entrega un **artifact HTML único** y, además, estos bloques de texto para copiar:

1. **Tokens de color** como CSS listo para pegar: variables `:root` y `.dark` con **estos nombres** (los de shadcn): `--background --foreground --card --card-foreground --popover --popover-foreground --primary --primary-foreground --secondary --secondary-foreground --muted --muted-foreground --accent --accent-foreground --destructive --border --input --ring --chart-1..5 --sidebar --sidebar-foreground --sidebar-primary --sidebar-primary-foreground --sidebar-accent --sidebar-accent-foreground --sidebar-border --sidebar-ring`, más los tokens **nuevos** que propongas (por ejemplo `--income`, `--expense`, `--warning`, `--success`, `--info`) con su par `-foreground`. Indica la razón de cada color y la relación de contraste de cada par de uso (texto sobre fondo).
2. **Escala tipográfica:** tamaños, pesos, interlineado y uso (título de página, sección, cifra héroe, cifra, cuerpo, apoyo, etiqueta), con la regla de cifras tabulares.
3. **Espaciado, radios y sombras:** valores concretos y dónde se usan.
4. **Especificación de cada componente** con sus estados y las clases de Tailwind o tokens que lo implementan, indicando qué cambia respecto del componente shadcn por defecto.
5. **Pantallas** en las tres anchuras y los dos temas.
6. **Movimiento:** duración y curva de las transiciones (apertura del sheet, aparición de toasts, pulsación de botones) y su versión con movimiento reducido.
7. **Accesibilidad:** orden de foco, nombres accesibles y cualquier excepción de contraste justificada.
8. **Lista de decisiones abiertas** o cosas que no pudiste resolver, para que las decidamos juntos.

Prioriza una identidad **calmada, legible y rápida de usar** sobre la decoración. Si algo del pedido choca con las restricciones técnicas, dímelo en vez de saltártelas.
