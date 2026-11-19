# Spec 017 — Dashboard: dinero disponible y evolución de gastos

- **Fecha:** 18 de noviembre de 2026
- **Autor:** ChatGPT (OpenAI), agente de IA
- **Estado:** Propuesta / pendiente de implementación
- **Destino:** Claude Code (revisión e implementación como spec nueva)

## Contexto

En el dashboard se muestra una tarjeta similar a:

> Dinero disponible · Estimado · S/ 4,061.60  
> Para gastar hasta el 30 nov 2026 · ≈ S/ 312.43 por día

La estimación diaria basada en el saldo total puede incentivar a gastar fondos que el usuario ya asignó a presupuestos. Si el usuario sí tiene presupuestos para el mes, esta indicación no representa correctamente su dinero libre ni su planificación.

También se desea impedir la selección accidental de texto al deslizar la pantalla en dispositivos móviles y visualizar mejor la evolución de gastos.

## Alcance propuesto

### 1. Dinero disponible: respetar los presupuestos del mes

Revisar el cálculo y el texto de la tarjeta **Dinero disponible** para que no sugiera gastar todo el saldo bancario sin considerar asignaciones presupuestarias.

- Si el usuario tiene presupuestos definidos para el mes actual, no mostrar el promedio diario derivado de todo el saldo disponible.
- Considerar los importes presupuestados y su saldo restante al calcular o presentar el dinero libre/no asignado.
- Diferenciar claramente entre:
  - saldo disponible en cuentas;
  - fondos comprometidos/asignados a presupuestos;
  - dinero libre o sin asignar (si puede calcularse de forma fiable).
- Evitar restar dos veces gastos o reservas ya contabilizados.
- Revisar que el texto sea informativo y no una invitación a consumir todo el saldo.

**Posible presentación cuando existen presupuestos:**

- Dinero disponible: saldo de cuentas.
- Dinero sin asignar: saldo disponible menos las asignaciones presupuestarias pendientes, siempre que el modelo financiero permita determinarlo sin ambigüedad.

Los nombres y cifras finales deben definirse tras inspeccionar la lógica de saldos, presupuestos y reservas del proyecto. No introducir un cálculo aproximado que pueda inducir a error.

### 2. Cuando no hay presupuestos

Si no hay presupuestos activos/definidos para el mes, conservar la utilidad de una orientación diaria de gasto:

- Mostrar el saldo disponible.
- Indicar que no hay presupuestos asignados.
- Mostrar un promedio diario estimado hasta el fin del mes, si la fórmula y los datos disponibles son adecuados.

La estimación diaria debe mostrarse únicamente bajo esta condición y etiquetarse como orientación, no como obligación o recomendación de gastar todo el saldo.

### 3. Desactivar selección accidental de texto en tarjetas

Aplicar `select-none` (o una solución equivalente de UX/CSS) a las tarjetas de dashboard pertinentes para que el gesto de desplazamiento en móvil no seleccione texto accidentalmente.

Alcance visual:
- Dinero disponible.
- Gastos del mes.
- Presupuestos restantes.

No desactivar selección de texto de forma global. Mantenerla en componentes y áreas donde seleccionar/copiar texto sea útil.

### 4. Evolución diaria de los gastos del mes

Añadir al dashboard una visualización diaria de gastos para el mes actual.

Requisitos deseados:
- Eje horizontal: días del mes.
- Eje vertical: importe gastado.
- Mostrar días sin gastos como cero, según corresponda.
- Interacción/tooltip para consultar el importe de un día.
- Identificar tendencias y días con gasto elevado.
- Excluir transferencias y ajustes de saldo que no constituyan gasto real.
- Utilizar los datos existentes y respetar la zona horaria y reglas de fecha del proyecto.

Elegir el tipo de gráfico (barras o líneas) que mejor se integre con la interfaz existente y sea legible en móvil.

### 5. Comparar gastos diarios con el mes anterior

Permitir comparar el comportamiento de gasto del mes actual con el mes anterior:

- Dos series claramente distinguibles en la gráfica: mes actual y mes anterior.
- Comparación hasta el mismo día del mes, para evitar comparar periodos de distinta duración.
- Resumen de totales de ambos periodos.
- Diferencia monetaria y porcentaje de variación, si los valores permiten calcularlos.
- Promedio diario de gasto de los periodos comparados, opcional si mejora la lectura.
- Considerar correctamente meses con diferente número de días.

Mantener la comparación consistente con la métrica actual de gastos del dashboard (gastos reales, excluyendo categorías de sistema/ajustes y transferencias, según las reglas del proyecto).

## Pendiente: retención/limpieza de datos cada seis meses

**No implementar en esta spec.**

Se ha sugerido eliminar datos antiguos cada seis meses para limitar el crecimiento de la base de datos, pero se deja como tarea pendiente para evaluación futura. No ejecutar borrados ni crear tareas automáticas de eliminación.

Antes de decidir una política de retención, evaluar alternativas como:
- Archivado.
- Índices y optimización de consultas.
- Retención configurable.
- Exportación/backup previo.
- Eliminación solo con consentimiento explícito.

El historial financiero es importante para comparaciones, informes y auditoría; la eliminación automática podría perjudicar cálculos históricos o integridad del saldo.

## Guías de implementación

- Revisar primero la arquitectura, componentes, hooks, servicios, esquema de base de datos y cálculos existentes del dashboard, presupuestos, saldos y reservas.
- Mantener la lógica de negocio en hooks/servicios, no en componentes presentacionales.
- Reutilizar componentes y patrones existentes.
- Evitar duplicar cálculos de gastos y mantener consistencia con la definición de gasto ya establecida.
- Respetar los componentes de gráficos, librerías, accesibilidad y diseño responsive ya presentes en el proyecto; no añadir dependencias sin necesidad.
- Asegurar estados de loading, error y datos vacíos.
- No romper tarjetas o secciones actuales ni alterar saldos históricos.
- Añadir o actualizar tests para las reglas nuevas, especialmente dinero libre vs. asignaciones presupuestarias y comparación de rangos mensuales.

## Criterios de aceptación

1. Cuando existen presupuestos para el mes, la tarjeta Dinero disponible no presenta una cifra diaria calculada desde todo el saldo como invitación a gastarlo.
2. Los fondos asignados a presupuestos se distinguen de dinero no asignado; los cálculos no duplican gastos ni reservas.
3. Cuando no existen presupuestos, puede mostrarse una estimación diaria con contexto y advertencia de que es orientativa.
4. Las tarjetas objetivo no permiten seleccionar accidentalmente el texto durante desplazamiento móvil.
5. La evolución diaria de gastos del mes puede visualizarse y consultarse por día.
6. La gráfica permite comparar el mes actual con el anterior usando periodos equivalentes (hasta el mismo día).
7. Transferencias y ajustes que no son gasto real no contaminan las gráficas ni los totales.
8. La tarea de retención/eliminación de datos cada seis meses permanece documentada como pendiente y no se implementa.

## Nota para el siguiente agente de IA

Esta propuesta fue elaborada por **ChatGPT (OpenAI), agente de IA**, el 18 de noviembre de 2026. Claude Code puede tratar este documento como una especificación de entrada para la siguiente implementación, verificarla contra el código real y señalar cualquier supuesto antes de modificar archivos.
