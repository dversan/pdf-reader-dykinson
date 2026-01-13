# Criterios Heurísticos para Generación de Índice (Bookmarks)

> [!IMPORTANT] > **Prioridad de Índice (TOC):** El sistema escanea primero las 20 páginas iniciales. Si detecta una página con título "Índice", "Index" o "Tabla de contenidos" y estructura correlativa (Texto... Número), extraerá los marcadores directamente de ella. La lógica heurística descrita abajo actúa solo como **mecanismo de respaldo (fallback)** cuando no se encuentra un índice explícito.

Este documento detalla la lógica y heurística implementada actualmente en `pdf_bookmark_viewer.js` para detectar y estructurar automáticamente el índice de un documento PDF.

## 0. Contexto de Interfaz (UI)

Esta funcionalidad se encuentra aislada en la pestaña **"Index"** dentro de la vista de Bookmarks.

- El usuario debe pulsar explícitamente el botón **"Create Index"** (icono de filtro) para iniciar el proceso.
- Los marcadores generados se guardan en un almacenamiento independiente (`pdfjs_index_bookmarks`) y no interfieren con los marcadores manuales de la pestaña "Custom Bookmarks".

## 1. Análisis de Fuentes

Para diferenciar títulos de texto normal, primero establecemos una "altura base" del cuerpo del texto:

- **Agrupación**: Se recorren todas las páginas (o una muestra de las primeras 100 para optimizar rendimiento) y se agrupan los caracteres por su altura de fuente.
- **Altura del Cuerpo**: Se determina que la altura más frecuente (la que tiene más caracteres acumulados) corresponde al texto del cuerpo (`bodyHeight`).

## 2. Identificación de Candidatos a Título

El sistema analiza cada línea de texto y la considera un posible título si cumple con ciertos criterios de estilo o contenido.

### Filtrado Inicial

Se descartan líneas si:

- Tienen menos de 3 caracteres **Y** su tamaño es igual al del cuerpo (se preservan títulos cortos como "I", "V", "1.").
- Son puramente numéricas (a menos que terminen en punto, ej. "1.").

### Criterios de Selección (OR)

Una línea se convierte en "candidato" si cumple **al menos una** de las siguientes condiciones:

1.  **Tamaño**: La altura de la fuente es mayor que el cuerpo (`> 1.1x` bodyHeight).
2.  **Negrita**: La fuente es negrita Y tiene al menos el mismo tamaño que el cuerpo.

- **Mayúsculas (All-Caps)**: Todo el texto está en mayúsculas, tiene más de 4 caracteres y es al menos del tamaño del cuerpo.
- **Letra Capital (Drop Cap) [NUEVO]**: Si una línea comienza con una letra gigante pero el resto del texto es tamaño cuerpo, se evalúa usando el tamaño del texto normal (ignorando la letra inicial). Esto evita falsos positivos.
- **Encabezado Explícito**: Contiene palabras clave como "Capítulo", "Parte", "Lección", números romanos o decimales ("1.", "1.1"), **Y TAMBIÉN**:
  - Comienza estrictamente con una **Mayúscula** o un **Dígito** (evita falsos positivos como "parte de...").
  - Su tamaño es al menos `0.9x` del cuerpo.

## 3. Limpieza y Normalización de Texto

Antes de procesar, se realizan correcciones específicas:

- **Espaciado Inteligente**: Se insertan espacios si la distancia horizontal entre caracteres supera el 20% del tamaño de fuente.
- **Corrección de Acentos (Spacing Acute)**: Detecta y corrige el carácter de acento separado (U+00B4) seguido de vocal (ej. "C ´ omo" -> "Cómo").
- **Diacríticos**: Se eliminan espacios innecesarios antes de marcas diacríticas combinables.

## 4. Fusión de Líneas (Multi-line Headers)

Si un título ocupa varias líneas, se fusionan en una sola entrada si:

- Son líneas consecutivas (misma página o siguiente).
- Tienen el **mismo estilo** (altura y peso de fuente).
- La línea siguiente comienza con minúscula O la anterior no termina en puntuación final (.?!).
- La línea siguiente **no** es un "Encabezado Explícito" por sí misma.

## 5. Asignación de Jerarquía (Niveles)

Una vez identificados los títulos, se les asigna un nivel de indentación (1, 2, 3...):

1.  **Por Tamaño**: Se ordenan todas las alturas de fuente encontradas en los candidatos de mayor a menor.
    - La altura más grande = Nivel 1.
    - La siguiente = Nivel 2, etc. (hasta Nivel 4).
2.  **Ajuste por Numeración**:
    - Si el texto comienza por `X.Y` (ej. "1.1"), se fuerza al menos Nivel 2.
    - Si comienza por `X.Y.Z` (ej. "1.1.1"), se fuerza al menos Nivel 3.

## Resumen del Flujo

`Texto PDF` -> `Agrupación por Líneas` -> `Limpieza` -> `Filtrado por Heurística (Tamaño/Negrita/Regex)` -> `Fusión de Líneas` -> `Jerarquización` -> `Índice Generado`.
