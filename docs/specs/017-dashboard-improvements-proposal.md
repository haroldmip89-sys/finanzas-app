# Spec 017 — Mejoras del dashboard financiero

- **Fecha:** 18 de noviembre de 2026
- **Autor:** ChatGPT (OpenAI), agente de IA
- **Estado:** Propuesta / pendiente de implementación
- **Destino:** Claude Code (implementador)

## Contexto

Se identificaron oportunidades de mejora en el dashboard para evitar que las cifras se interpreten como una invitación a gastar saldo que ya tiene un destino presupuestado, mejorar la usabilidad móvil y ofrecer una lectura visual de la evolución de gastos.

Esta spec contiene sugerencias. **No se ha implementado ningún cambio de código.**

## 1. Dinero disponible y presupuestos

### Problema actual

El card «Dinero disponible» presenta una cifra de saldo y un promedio diario (por ejemplo, «≈ S/ 312.43 por día» hasta el cierre del mes). El promedio se calcula como si el saldo completo estuviera libre para gastarse, aunque el usuario tenga presupuestos asignados.

Esta presentación puede incentivar a gastar fondos que ya están destinados a presupuestos y no refleja necesariamente el plan financiero del usuario.

### Comportamiento propuesto

- Si el usuario **tiene presupuestos asignados para el mes vigente**, no presentar el promedio diario derivado de todo el saldo como límite de gasto sugerido.
- Dar prioridad a una cifra que tenga en cuenta el dinero presupuestado y, si la lógica de dominio lo permite, mostrar cuánto saldo queda sin asignar.
- Diferenciar claramente:
  - saldo disponible en cuentas;
  - importe restante en presupuestos;
  - dinero sin asignar (si se puede calcular de forma consistente).
- No descontar presupuestos de saldo ni reservas dos veces. Revisar las definiciones existentes del dominio antes de introducir una fórmula nueva.
- Evitar etiquetas que sugieran que el saldo total debe gastarse.

### Cuando no existen presupuestos

Solo si el usuario no tiene presupuestos asignados para el mes, se puede conservar una estimación diaria orientativa, calculada con el saldo y los días restantes. Debe estar claramente etiquetada como estimación, no como objetivo ni obligación de gasto.

### UX / copy sugerido

Con presupuestos existentes, priorizar mensajes como:
- «Saldo disponible en tus cuentas»
- «Sin asignar a presupuestos» (solo si el importe se calcula con una definición confiable)

Sin presupuestos:
- «Sin presupuestos asignados este mes»
- «Promedio diario estimado hasta fin de mes» (si se mantiene la estimación)

No fijar copy ni fórmula final sin revisar las reglas actuales del sistema para saldos, presupuestos y reservas.

## 2. Evitar selección accidental de texto en cards

En las tarjetas del dashboard —incluyendo «Dinero disponible», «Gastos del mes» y «Presupuestos restantes»— evitar que el texto se seleccione accidentalmente cuando el usuario desliza o arrastra la pantalla en dispositivos móviles.

- Aplicar una solución de UI como `select-none` a los contenedores adecuados.
- No deshabilitar selección de texto de manera global: conservarla en controles y contenidos donde copiar texto sea útil o necesario.
- Mantener accesibilidad y no afectar botones, enlaces ni interacciones.

## 3. Evolución diaria de gastos del mes

Añadir una visualización para observar la evolución de los gastos por día durante el mes actual.

Requisitos sugeridos:
- Gráfica de barras o líneas con los días del mes en el eje horizontal y gasto diario en el vertical.
- Incluir días sin gastos con valor cero para que la escala temporal sea consistente.
- Mostrar monto al interactuar con un punto/barra (tooltip o equivalente accesible).
- Contabilizar solo gastos válidos; excluir transferencias, ajustes y categorías del sistema según las reglas que ya emplea el resumen de gastos.
- No sobrecargar el dashboard; usar diseño responsive y coherente con los componentes existentes.

## 4. Comparación con el mes anterior

La evolución diaria debe permitir comparar el mes vigente con el anterior.

- Comparar periodos equivalentes: del día 1 al día actual del mes vigente, frente al día 1 al mismo número de día del mes anterior (limitado al último día de ese mes).
- Mostrar ambos periodos de manera distinguible en la gráfica, con leyenda clara.
- Resumen complementario, si cabe:
  - gasto del periodo actual;
  - gasto del periodo anterior equivalente;
  - diferencia monetaria;
  - variación porcentual (controlando el caso en que el periodo anterior sea cero);
  - promedio diario de gasto.
- Reutilizar las utilidades de comparación de fechas y reglas del resumen existentes cuando sea posible, evitando duplicar lógica de fechas.

## 5. Retención / limpieza de datos — PENDIENTE

**No implementar ni borrar datos como parte de esta spec.**

Se plantea investigar si es posible optimizar el almacenamiento y definir una política de retención de datos, incluyendo la idea original de revisar la eliminación de registros antiguos cada seis meses.

Antes de considerar borrado automático, evaluar:
- valor del historial para reportes y comparaciones;
- impacto en saldos y cálculos financieros;
- dependencias, integridad y auditoría;
- exportación o respaldo previo;
- archivado como alternativa a borrar;
- configuración y consentimiento explícito del usuario.

Esta sección es solo una tarea pendiente de evaluación futura. No crear cron jobs, tareas programadas ni procesos de borrado.

## 6. Consideraciones de implementación

- Inspeccionar componentes, hooks, servicios, esquema y lógica financiera existentes antes de modificar.
- Mantener separación de responsabilidades: cálculos y consultas en hooks/servicios según la arquitectura existente; componentes presentacionales sin lógica de negocio innecesaria.
- Reutilizar los servicios y reglas de gastos que ya excluyen ajustes y transferencias.
- Evitar cálculos redundantes o inconsistentes entre dashboard, presupuestos y saldo.
- Usar componentes gráficos ya presentes en el proyecto, si son adecuados; evitar agregar una dependencia sin necesidad.
- Diseñar para móvil y escritorio, estados de carga, error y datos vacíos.
- Agregar o actualizar pruebas de cálculos, especialmente para presupuestos, meses con diferente cantidad de días y comparación cuando el gasto previo sea cero.
- No cambiar datos persistidos ni eliminar registros.

## 7. Criterios de aceptación

1. Cuando hay presupuestos para el mes actual, el card de dinero disponible no sugiere gastar el saldo completo dividiéndolo entre días restantes.
2. Cuando no hay presupuestos, la estimación diaria puede mostrarse y está identificada claramente como orientativa.
3. La información de saldo, presupuestos restantes y dinero sin asignar no se confunde ni se cuenta doble.
4. El texto de los cards indicados no se selecciona accidentalmente en móvil, sin afectar controles interactivos.
5. El dashboard muestra una evolución diaria de gastos del mes, incluyendo días sin movimientos.
6. La gráfica permite comparar el periodo actual con el periodo equivalente del mes anterior.
7. Ajustes y transferencias no se contabilizan como gastos en las visualizaciones.
8. Retención o eliminación de datos antiguos no se implementa; permanece como pendiente separado.

## Nota para el siguiente agente

Esta propuesta fue redactada por otro agente de IA (ChatGPT/OpenAI) el 18 de noviembre de 2026. Claude Code debe usarla como contexto inicial, inspeccionar el estado real del repositorio y desarrollar una spec de implementación o ejecutar el trabajo solicitado por el usuario. No asumir que las sugerencias o fórmulas aquí descritas ya están implementadas o son definitivas.
