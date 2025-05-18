import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TonnetzGrid } from './TonnetzGrid.js';

class TonnetzVisualizer {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        document.body.appendChild(this.renderer.domElement);

        // Configuración de la cámara
        this.camera.position.z = 10;

        // Controles de órbita
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        // Crear la cuadrícula del Tonnetz
        this.tonnetzGrid = new TonnetzGrid(this.scene);

        // Configurar raycaster para interacción
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.setupInteraction();

        // Manejo de redimensionamiento de ventana
        window.addEventListener('resize', this.onWindowResize.bind(this));

        // Iniciar el bucle de renderizado
        this.animate();
    }

    setupInteraction() {
        window.addEventListener('click', (event) => {
            // Calcular posición del mouse en coordenadas normalizadas (-1 a +1)
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

            // Actualizar el raycaster
            this.raycaster.setFromCamera(this.mouse, this.camera);

            // Obtener intersecciones con los nodos
            const intersects = this.raycaster.intersectObjects(
                Array.from(this.tonnetzGrid.nodes.values())
            );

            if (intersects.length > 0) {
                const node = intersects[0].object;
                // Encontrar el ID del nodo
                for (const [id, mesh] of this.tonnetzGrid.nodes.entries()) {
                    if (mesh === node) {
                        this.tonnetzGrid.updateNodeColor(id, 0xff0000);
                        break;
                    }
                }
            }
        });
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

// Iniciar la aplicación
const app = new TonnetzVisualizer(); 