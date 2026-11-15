# Yupi! — entrega de diseño

- **Canvas con todas las pantallas:** https://claude.ai/artifact/5xiYtwn7ZZxMicKzg2NSRJ (privado hasta compartirlo).
- **Tokens de color listos para pegar:** [`yupi-tokens.css`](./yupi-tokens.css).
- Siguiente paso: spec `docs/specs/012-ui-foundation.md`.

El canvas tiene 16 artboards: Fundamentos, Componentes, 7 pantallas móviles en tema oscuro, formularios (bottom sheets), estados, tema claro, y Login, Inicio, Movimientos (1280 px) y Cuentas (768 px). Cada artboard tiene un ajuste `theme` (dark / light) en su panel Tweaks. «Nueva transacción» es interactiva: cambia Gasto / Ingreso, elige una categoría y escribe el monto.

## 1. Color

Hay un solo color de marca: un **violeta sereno** (`--primary`). Se distingue de los colores del dinero:

| Token | Uso | Oscuro (contraste) | Claro (contraste) |
|---|---|---|---|
| `--income` | Ingresos (+) | 10.08 | 5.25 |
| `--expense` | Gastos (−), coral en vez de rojo | 7.64 | 5.31 |
| `--debt` | Deuda de tarjetas | 7.88 | 5.99 |
| `--warning` | Cerca del límite | 10.83 | 4.87 |
| `--success` | Holgado, logros | 9.68 | 5.32 |
| `--info` | Marca «Estimado» | 9.05 | 5.53 |
| `--destructive` | Solo eliminar y errores | 6.16 | 5.49 |

Los contrastes son del texto sobre `--card`. Los valores completos y sus hex están en `yupi-tokens.css`.

Reglas:

- Los importes llevan siempre signo. En las listas, los **gastos van en `--foreground`** y los ingresos en `--income`, para que la lista no se vea alarmante. El coral `--expense` se usa en íconos, en el selector Gasto y en el badge «Excedido».
- Lo estimado lleva un **borde punteado `--info`, un ícono y la palabra «Estimado»**. Así nunca parece un saldo confirmado.
- Los fondos suaves usan opacidad: `bg-income/15` en oscuro y `/12` en claro.

## 2. Tipografía (Plus Jakarta Sans, `tabular-nums` en `body`)

| Rol | Móvil | Escritorio | Clases |
|---|---|---|---|
| Cifra héroe | 40/44 · 800 · −0.02em | 48/52 | `text-[40px] leading-[44px] font-extrabold tracking-tight` |
| Título de página | 24/32 · 700 | 28/36 | `text-2xl font-bold` |
| Cifra | 22/28 · 700 | 24–26 | `text-[22px] font-bold` |
| Sección | 17/24 · 650 | igual | `text-[17px] font-semibold` |
| Cuerpo | 15/22 · 500 | igual | `text-[15px] font-medium`; inputs `text-base` (16 px) |
| Importe en lista | 15/20 · 650 | igual | `text-[15px] font-semibold` |
| Apoyo | 13/18 · 500 | igual | `text-[13px] text-muted-foreground` |
| Etiqueta | 12/16 · 600 · +0.01em | igual | `text-xs font-semibold` |

Geist Mono queda solo para datos técnicos.

## 3. Espaciado, radios y sombras

- **Base de 4 px.** Margen lateral: 16 px en móvil, 24 px en tablet y 32 px en escritorio. Padding de tarjeta: 16 px en móvil y 20 px en escritorio. Separación entre tarjetas: 12 px en móvil y 16 px en escritorio.
- **Radios** (`--radius: 0.875rem`):
  - 8 px: esqueletos de texto.
  - 12 px: botones y campos.
  - 14 px: íconos de categoría.
  - 18 px: tarjetas y menús.
  - 24 px: bottom sheet, diálogo y héroe.
  - Pill: chips, badges y FAB.
- **Sombras.** En oscuro, las tarjetas no llevan sombra: se separan por superficie y un borde de 1 px. Solo las capas elevadas llevan sombra: `0 12px 32px oklch(0 0 0 / .5)`. En claro, las tarjetas llevan `0 1px 2px oklch(.2 .02 268 / .06)` y las capas elevadas `0 12px 32px oklch(.2 .02 268 / .12)`.

## 4. Componentes (cambios respecto de shadcn base-nova)

- **Button:** el tamaño default pasa a `h-11` (44 px), con `rounded-xl text-[15px] font-semibold`. Hay además `sm h-9`, `lg h-13` e `icon size-11`. Al pulsarlo: `active:scale-[.97]`. Estado de carga: un spinner y el texto «Guardando…». La variante destructiva conserva el estilo suave de base-nova (`bg-destructive/10 text-destructive`).
- **Input:** `h-11 rounded-xl border-input text-base`. Con foco: `border-ring ring-3 ring-ring/20`. Con error: `aria-invalid:border-destructive` y un mensaje debajo.
- **Campo de monto:** `S/` en `text-muted-foreground` seguido del input `text-[44px] font-extrabold inputmode="decimal"`, todo sobre `bg-background rounded-2xl`.
- **Tabs:** hay dos estilos.
  - Segmentado (Gasto | Ingreso, Gastos | Ingresos): `bg-muted p-1 rounded-[14px]`; la pestaña activa lleva `bg-popover`.
  - Tira de Movimientos: subrayado de 2 px en `primary`.
- **Badge:** `h-6 rounded-full px-2.5 text-xs font-semibold bg-{token}/15 text-{token}`. «Estimado» usa `border-dashed border-info`. «Ajuste» usa `border-input` sin relleno.
- **Tarjeta de recurso:** `rounded-2xl border p-4`, con un ícono `size-11` sobre fondo tintado, el valor en `text-[17px] font-bold` y un menú `size-11` fantasma.
- **Tarjeta de cifra:** muestra una etiqueta de 13 px y la cifra de 20–24 px, con color semántico solo cuando aporta.
- **Barra de progreso:** `h-2 rounded-full bg-muted`. El color del relleno sigue el estado: `success`, `warning` o `expense`. El estado siempre se escribe en texto también.
- **Navegación inferior:** `h-[72px]` más el área segura, con 5 posiciones: Inicio, Movimientos, «+» (FAB `size-14 -mt-7`), Cuentas y Ajustes.
- **Menú lateral (≥1024 px):** 232 px, con el logo, el botón «Nuevo movimiento», los 3 destinos y Ajustes separado.
- **Rail (768 px):** 88 px, con íconos y etiquetas.
- **Bottom sheet:** `rounded-t-3xl` con un asa de 40×4 px. El cierre es una X de 44 px. El fondo usa el scrim `bg-black/60` en oscuro. Desde 640 px el sheet pasa a ser un diálogo `max-w-md rounded-3xl p-6`.
- **Toast:** `bg-popover`, con un ícono `success` en círculo, título y detalle, y un botón de cierre de 44 px. Usa `role="status"`.
- **Estados:**
  - Esqueleto: bloques `bg-muted` con la misma geometría que el contenido real.
  - Vacío: ícono, título, una línea y una acción principal.
  - Error: tranquiliza al usuario («Tus datos están a salvo») y ofrece Reintentar.

## 5. Movimiento

| Transición | Normal | Movimiento reducido |
|---|---|---|
| Pulsar botón | `scale(.97)` 90 ms ease-out | Sin escala |
| Abrir sheet | `translateY(100%→0)` 280 ms `cubic-bezier(.32,.72,0,1)`; scrim 200 ms | Fade 150 ms |
| Cerrar sheet | 200 ms `cubic-bezier(.4,0,1,1)` | Fade 120 ms |
| Diálogo | Opacidad y `scale(.96→1)` 180 ms | Fade 120 ms |
| Toast | `translateY(8px)` y fade 200 ms; visible 4 s | Fade; visible 6 s |
| «¿Cómo se calculó?» | Altura y opacidad 200 ms | Instantáneo |
| Esqueleto | Pulso de 1.5 s | Estático |

## 6. Accesibilidad

- **Foco:** `focus-visible:ring-2 ring-ring ring-offset-2 ring-offset-background`.
- **Orden de foco en móvil:** cabecera, contenido, «+» y navegación inferior.
- **Orden de foco en el sheet:** cerrar, Gasto/Ingreso, monto (autofocus), categorías, fecha, cuenta, nota, «Guardar y agregar otro» y «Guardar».
- **Orden de foco en escritorio:** primero un enlace «Saltar al contenido», luego el menú lateral.
- **Nombres accesibles:**
  - El botón «+» se llama «Nuevo movimiento».
  - Cada menú se llama «Acciones de {nombre}».
  - Cada importe lleva un `aria-label` como «Gasto de 18.50 soles».
  - Los gráficos usan `role="img"` y describen su contenido en texto.
- **Excepciones de contraste:** `--border` (≈1.3:1) es decorativo; los límites de los campos usan `--input`, que pasa de 3:1. En claro, `chart-2` y `chart-3` rozan 3:1, por eso siempre van con leyenda y valor en texto.
- **Destinos táctiles:** al menos 44 px. Las filas de lista miden 64 px.

## 7. Decisiones abiertas

1. **Logotipo.** El isotipo «Y!» en violeta es provisional.
2. **Teclado del monto.** Propongo el teclado del sistema (`inputmode="decimal"`) en lugar de un teclado dibujado en el sheet.
3. **Umbrales de presupuesto.** Propongo: holgado por debajo del 75 %, cerca del límite entre 75 y 100 %, excedido por encima del 100 %.
4. **Fórmula de «Dinero disponible».** El diseño usa: saldo en cuentas − obligaciones hasta fin de mes − resto de deuda de tarjetas. Falta confirmarla con la spec 009a.
5. **Carrusel del login.** Hoy usa composiciones de la propia UI; faltan imágenes reales.
6. **Clerk y OKLCH.** Si `appearance.variables` no acepta `oklch()`, se usan los hex de `yupi-tokens.css`.
7. **Altura del botón.** La altura default de base-nova (32 px) choca con los 44 px táctiles. Propongo `h-11` en móvil y `h-10` en escritorio.
8. **Color de la deuda.** La deuda va en rosa y el gasto en coral: se distinguen por tono y por el texto «Deuda». ¿Sirve así o preferimos ámbar para la deuda?
9. **Ajustes en la barra inferior.** Puse Ajustes como quinta posición de la barra inferior. Sigue fuera del trío principal y el «+» queda centrado. Alternativa: dejar Ajustes solo en la cabecera de Inicio.
