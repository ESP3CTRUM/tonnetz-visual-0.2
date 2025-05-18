import * as THREE from 'three';

const NOTES = [
    'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4',
    'C5', 'C#5', 'D5', 'D#5', 'E5', 'F5', 'F#5', 'G5', 'G#5', 'A5', 'A#5', 'B5'
];

export class TonnetzGrid {
    constructor(scene) {
        this.scene = scene;
        this.nodes = new Map();
        this.connections = [];
        this.triads = [];
        this.nodeGeometry = new THREE.SphereGeometry(0.45, 32, 32);
        this.nodeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        this.connectionMaterial = new THREE.MeshBasicMaterial({ color: 0x666666 });
        this.triadMaterial = new THREE.MeshBasicMaterial({ color: 0x8888ff, transparent: true, opacity: 0.25 });
        this.nodeNotes = new Map();
        this.generateGrid();
    }

    generateGrid() {
        // Generar nodos en una cuadrícula triangular
        const spacing = 1.5;
        const rows = 5;
        const cols = 7;
        let noteIndex = 0;

        // Crear nodos
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = col * spacing;
                const y = row * spacing * Math.sqrt(3) / 2;
                const z = 0;

                const node = new THREE.Mesh(this.nodeGeometry, this.nodeMaterial.clone());
                node.position.set(x, y, z);
                node.userData = { type: 'node' };
                this.scene.add(node);
                const nodeId = `${row}-${col}`;
                this.nodes.set(nodeId, node);
                // Asignar nota al nodo
                this.nodeNotes.set(nodeId, NOTES[noteIndex % NOTES.length]);
                noteIndex++;
            }
        }
        // Crear conexiones y triángulos
        for (let row = 0; row < rows - 1; row++) {
            for (let col = 0; col < cols - 1; col++) {
                // Triángulo superior
                const n1 = this.nodes.get(`${row}-${col}`);
                const n2 = this.nodes.get(`${row + 1}-${col}`);
                const n3 = this.nodes.get(`${row}-${col + 1}`);
                if (n1 && n2 && n3) {
                    this.createConnection(n1, n2);
                    this.createConnection(n1, n3);
                    this.createConnection(n2, n3);
                    this.createTriad([n1, n2, n3]);
                }
                // Triángulo inferior
                const n4 = this.nodes.get(`${row + 1}-${col}`);
                const n5 = this.nodes.get(`${row + 1}-${col + 1}`);
                const n6 = this.nodes.get(`${row}-${col + 1}`);
                if (n4 && n5 && n6) {
                    this.createConnection(n4, n5);
                    this.createConnection(n4, n6);
                    this.createConnection(n5, n6);
                    this.createTriad([n4, n5, n6]);
                }
            }
        }
    }

    createTriad(nodes) {
        // Calcular el centro del triángulo
        const center = new THREE.Vector3();
        nodes.forEach(n => center.add(n.position));
        center.divideScalar(3);
        // Crear un pequeño círculo/transparente para raycasting y animación
        const geometry = new THREE.CircleGeometry(0.5, 32);
        const mesh = new THREE.Mesh(geometry, this.triadMaterial.clone());
        mesh.position.copy(center);
        mesh.userData = { type: 'triad', nodes };
        mesh.lookAt(mesh.position.x, mesh.position.y, mesh.position.z + 1); // Orientar plano
        this.scene.add(mesh);
        this.triads.push(mesh);
    }

    getNodeNote(nodeId) {
        return this.nodeNotes.get(nodeId);
    }

    updateNodeColor(nodeId, color) {
        const node = this.nodes.get(nodeId);
        if (node) {
            node.material.color.set(color);
        }
    }

    updateNodeScale(nodeId, scale) {
        const node = this.nodes.get(nodeId);
        if (node) {
            node.scale.set(scale, scale, scale);
        }
    }

    updateTriadColor(triad, color) {
        if (triad) {
            triad.material.color.set(color);
        }
    }

    updateTriadScale(triad, scale) {
        if (triad) {
            triad.scale.set(scale, scale, scale);
        }
    }
}
