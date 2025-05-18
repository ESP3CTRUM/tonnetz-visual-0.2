# Tonnetz Visual

Visualización 3D interactiva del Tonnetz con soporte MIDI.

## Características

- Visualización 3D del Tonnetz usando Three.js
- Interacción con nodos mediante clics
- Navegación 3D con controles de órbita
- Efectos visuales dinámicos
- Optimización de rendimiento

## Requisitos

- Node.js 14.0 o superior
- Navegador moderno con soporte WebGL

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
│   ├── main.js           # Punto de entrada principal
│   └── TonnetzGrid.js    # Clase para la generación del Tonnetz
├── index.html            # Archivo HTML principal
├── package.json          # Dependencias y scripts
└── README.md            # Documentación
```

## Desarrollo

El proyecto está estructurado en épicas:

1. Visualización 3D del Tonnetz
2. Reproducción de MIDI y Síntesis de Audio
3. Interacción del Usuario
4. Personalización de UI/UX

## Licencia

MIT 