import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TonnetzGrid } from './TonnetzGrid.js';
import { audioEngine } from './audio.js';
import { midiManager } from './midi.js';
import * as Tone from 'tone';
import TWEEN from '@tweenjs/tween.js';

const PALETTES = {
    warm: { node: '#FF5733', line: '#FFC300', background: '#F2A65A' },
    cool: { node: '#3498DB', line: '#2ECC71', background: '#B3B6B7' },
    neutral: { node: '#808080', line: '#A9A9A9', background: '#D3D3D3' }
};

class TonnetzVisualizer {
    static CAMERA_Y_MAX = 10;
    static CAMERA_Y_MIN = -10;
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
        this.centerCameraOnGrid();

        // Configurar raycaster para interacción
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.activeNodes = new Set();
        this.activeTriads = new Set();
        this.setupInteraction();

        // MIDI
        this.midiLoaded = false;
        this.midiEvents = [];
        this.midiNoteToNodeId = this.buildMidiNoteToNodeId();
        this.setupMidiInput();
        this.setupMidiPlayback();

        // Manejo de redimensionamiento de ventana
        window.addEventListener('resize', this.onWindowResize.bind(this));

        // UI/UX
        this.currentPalette = 'warm';
        this.applyPalette('warm');
        this.setupUIControls();

        // --- OPTIMIZACIÓN: BUFFER CIRCULAR PARA NODOS Y CONECTORES ---
        // Pool de objetos reutilizables para nodos y conexiones
        // (para grids grandes, pero aquí se deja preparado para escalabilidad)
        this.nodePool = [];
        this.connectionPool = [];

        // Iniciar el bucle de renderizado
        this.animate();
    }

    buildMidiNoteToNodeId() {
        const map = {};
        for (const [id, note] of this.tonnetzGrid.nodeNotes.entries()) {
            const midiNumber = this.noteToMidiNumber(note);
            map[midiNumber] = id;
        }
        return map;
    }

    noteToMidiNumber(note) {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const match = note.match(/^([A-G]#?)(\d)$/);
        if (!match) return null;
        const pitch = match[1];
        const octave = parseInt(match[2], 10);
        return notes.indexOf(pitch) + 12 * (octave + 1);
    }

    setupMidiInput() {
        const input = document.getElementById('midi-input');
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                const arrayBuffer = event.target.result;
                midiManager.parse(arrayBuffer);
                this.midiEvents = midiManager.getNoteEvents();
                this.midiLoaded = true;
                alert('Archivo MIDI cargado correctamente.');
            };
            reader.readAsArrayBuffer(file);
        });
    }

    setupMidiPlayback() {
        const playBtn = document.getElementById('play-midi');
        playBtn.addEventListener('click', async () => {
            if (!this.midiLoaded || this.midiEvents.length === 0) {
                alert('Primero carga un archivo MIDI.');
                return;
            }
            await audioEngine.resumeContext();
            Tone.Transport.cancel();
            Tone.Transport.stop();
            Tone.Transport.position = 0;

            const ticksPerBeat = midiManager.getTicksPerBeat();
            const tempo = midiManager.getTempo();
            Tone.Transport.bpm.value = tempo;
            for (const event of this.midiEvents) {
                const time = (event.time / ticksPerBeat) * (60 / tempo);
                Tone.Transport.schedule((t) => {
                    const nodeId = this.midiNoteToNodeId[event.note];
                    if (nodeId) {
                        this.animateNode(nodeId, 0x00ff00);
                        const note = this.tonnetzGrid.getNodeNote(nodeId);
                        if (note) {
                            audioEngine.playNote(note, '8n');
                        }
                    }
                }, time);
            }
            Tone.Transport.start();
        });
    }

    animateNode(nodeId, color) {
        const node = this.tonnetzGrid.nodes.get(nodeId);
        if (!node) return;
        // Animar color
        const origColor = node.material.color.clone();
        new TWEEN.Tween(node.material.color)
            .to({ r: ((color >> 16) & 0xff) / 255, g: ((color >> 8) & 0xff) / 255, b: (color & 0xff) / 255 }, 150)
            .yoyo(true)
            .repeat(1)
            .start();
        // Animar escala
        new TWEEN.Tween(node.scale)
            .to({ x: 1.5, y: 1.5, z: 1.5 }, 150)
            .yoyo(true)
            .repeat(1)
            .start();
    }

    animateTriad(triad, color) {
        if (!triad) return;
        // Animar color
        new TWEEN.Tween(triad.material.color)
            .to({ r: ((color >> 16) & 0xff) / 255, g: ((color >> 8) & 0xff) / 255, b: (color & 0xff) / 255 }, 150)
            .yoyo(true)
            .repeat(1)
            .start();
        // Animar escala
        new TWEEN.Tween(triad.scale)
            .to({ x: 1.5, y: 1.5, z: 1.5 }, 150)
            .yoyo(true)
            .repeat(1)
            .start();
    }

    // Centrado dinámico de cámara al grid
    centerCameraOnGrid() {
        // Calcular el centroide de todos los nodos
        let sum = new THREE.Vector3(0, 0, 0);
        let count = 0;
        for (const node of this.tonnetzGrid.nodes.values()) {
            sum.add(node.position);
            count++;
        }
        if (count > 0) {
            sum.divideScalar(count);
            this.camera.position.x = sum.x;
            this.camera.position.y = sum.y;
            // Mantener la distancia z
        }
        this.controls.target.set(sum.x, sum.y, 0);
        this.controls.update();
    }

    setupInteraction() {
        window.addEventListener('click', async (event) => {
            await audioEngine.resumeContext();
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
            this.raycaster.setFromCamera(this.mouse, this.camera);
            // Buscar intersección con triángulos primero (hitbox triangular)
            const triadIntersects = this.raycaster.intersectObjects(this.tonnetzGrid.triads);
            if (triadIntersects.length > 0) {
                const triad = triadIntersects[0].object;
                this.animateTriad(triad, 0xffff00);
                // Animar y reproducir las notas de los nodos de la triada
                for (const node of triad.userData.nodes) {
                    for (const [id, mesh] of this.tonnetzGrid.nodes.entries()) {
                        if (mesh === node) {
                            this.animateNode(id, 0xffff00);
                            const note = this.tonnetzGrid.getNodeNote(id);
                            if (note) {
                                audioEngine.playNote(note);
                            }
                        }
                    }
                }
                return; // Si se hace clic en triada, no procesar nodos
            }
            // Si no, buscar intersección con nodos
            const nodeIntersects = this.raycaster.intersectObjects(Array.from(this.tonnetzGrid.nodes.values()));
            if (nodeIntersects.length > 0) {
                const obj = nodeIntersects[0].object;
                for (const [id, mesh] of this.tonnetzGrid.nodes.entries()) {
                    if (mesh === obj) {
                        this.animateNode(id, 0xff0000);
                        const note = this.tonnetzGrid.getNodeNote(id);
                        if (note) {
                            audioEngine.playNote(note);
                        }
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
        TWEEN.update();
        // Limitar la posición Y de la cámara
        this.camera.position.y = Math.max(Math.min(this.camera.position.y, TonnetzVisualizer.CAMERA_Y_MAX), TonnetzVisualizer.CAMERA_Y_MIN); // Clamp eje Y
        this.renderer.render(this.scene, this.camera);
    }

    setupUIControls() {
        // Instrumento
        const instrumentSelect = document.getElementById('instrument-select');
        instrumentSelect.addEventListener('change', async (e) => {
            await audioEngine.setInstrument(e.target.value);
        });
        // Pantalla completa
        document.getElementById('fullscreen-btn').onclick = () => {
            const elem = document.documentElement;
            if (!document.fullscreenElement) {
                if (elem.requestFullscreen) elem.requestFullscreen();
            } else {
                if (document.exitFullscreen) document.exitFullscreen();
            }
        };
        // Reset de vista
        document.getElementById('reset-btn').onclick = () => {
            this.camera.position.set(0, 0, 10);
            this.controls.reset();
        };
        // Selector de paleta
        const paletteSelect = document.getElementById('palette-select');
        paletteSelect.addEventListener('change', (e) => {
            this.applyPalette(e.target.value);
        });
    }

    applyPalette(paletteName) {
        const palette = PALETTES[paletteName];
        if (!palette) return;
        this.currentPalette = paletteName;
        // Fondo
        this.renderer.setClearColor(palette.background);
        // Nodos
        for (const node of this.tonnetzGrid.nodes.values()) {
            node.material.color.set(palette.node);
        }
        // Conexiones
        for (const conn of this.tonnetzGrid.connections) {
            conn.material.color.set(palette.line);
        }
    }

    // Métodos para obtener y liberar nodos/conexiones (buffer circular)
    getNodeFromPool() {
        if (this.nodePool.length > 0) {
            const node = this.nodePool.pop();
            node.visible = true;
            return node;
        }
        return new THREE.Mesh(this.tonnetzGrid.nodeGeometry, this.tonnetzGrid.nodeMaterial.clone());
    }
    releaseNodeToPool(node) {
        node.visible = false;
        this.nodePool.push(node);
    }
    getConnectionFromPool() {
        if (this.connectionPool.length > 0) {
            const conn = this.connectionPool.pop();
            conn.visible = true;
            return conn;
        }
        return new THREE.Line(new THREE.BufferGeometry(), this.tonnetzGrid.connectionMaterial.clone());
    }
    releaseConnectionToPool(conn) {
        conn.visible = false;
        this.connectionPool.push(conn);
    }
}

// Pantalla de carga
const loadingOverlay = document.createElement('div');
loadingOverlay.id = 'loading-overlay';
loadingOverlay.style.position = 'fixed';
loadingOverlay.style.top = '0';
loadingOverlay.style.left = '0';
loadingOverlay.style.width = '100vw';
loadingOverlay.style.height = '100vh';
loadingOverlay.style.background = 'rgba(20,20,20,0.95)';
loadingOverlay.style.display = 'flex';
loadingOverlay.style.alignItems = 'center';
loadingOverlay.style.justifyContent = 'center';
loadingOverlay.style.zIndex = '1000';
loadingOverlay.innerHTML = '<span style="color:white;font-size:2rem;">Cargando Tonnetz...</span>';
document.body.appendChild(loadingOverlay);

// LoadingManager de Three.js
const loadingManager = new THREE.LoadingManager();
loadingManager.onLoad = () => {
    loadingOverlay.style.display = 'none';
};

// Modificar la inicialización para esperar a que todo esté listo
async function startApp() {
    // Esperar a que el instrumento de audio cargue
    await audioEngine.init();
    // Inicializar visualizador
    const app = new TonnetzVisualizer();
    // Ocultar overlay si todo está listo
    loadingManager.onLoad();
}

startApp();
