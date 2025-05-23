# Tonnetz Visual

Visualización 3D interactiva del Tonnetz con soporte MIDI.

## Características

- Visualización 3D del Tonnetz usando Three.js
- Interacción con nodos y triadas mediante clics (hitboxes triangulares y reproducción de tríadas)
- Navegación 3D con controles de órbita
- Efectos visuales dinámicos
- Optimización de rendimiento con BufferGeometry y pool de objetos (buffer circular)
- Pantalla de carga con THREE.LoadingManager
- Centrado dinámico de cámara y limitación de movimiento en eje Y
- Personalización de paleta de colores e instrumento

## Requisitos

- Node.js 14.0 o superior
- Navegador moderno con soporte WebGL2

## Instalación

1. Clonar el repositorio:
```bash
git clone https://github.com/tu-usuario/tonnetz-visual.git
cd tonnetz-visual
```

2. Instalar dependencias:
```bash
npm install
```

3. Iniciar el servidor de desarrollo:
```bash
npm run dev
```

4. Abrir el navegador en `http://localhost:5173`

## Estructura del Proyecto

```
tonnetz-visual/
├── src/
│   ├── main.js           # Punto de entrada principal (pantalla de carga, cámara, interacción, buffer circular)
│   ├── TonnetzGrid.js    # Clase para la generación del Tonnetz (BufferGeometry, conexiones, triadas)
│   ├── audio.js          # Motor de audio y síntesis
│   └── midi.js           # Parseo y gestión de archivos MIDI
├── index.html            # Archivo HTML principal
├── package.json          # Dependencias y scripts
└── README.md            # Documentación
```

## Cambios y Mejoras Recientes

- Pantalla de carga con THREE.LoadingManager
- Refactorización de nodos a BufferGeometry para mejor rendimiento
- Centrado dinámico de cámara y limitación de movimiento en eje Y
- Hitboxes triangulares para triadas y reproducción de tríadas al seleccionar triángulo
- Optimización con buffer circular (pool de objetos reutilizables)

## Desarrollo

El proyecto está estructurado en épicas:

1. Visualización 3D del Tonnetz
2. Reproducción de MIDI y Síntesis de Audio
3. Interacción del Usuario
4. Personalización de UI/UX
5. Optimización y escalabilidad para grids grandes

## Licencia

MIT