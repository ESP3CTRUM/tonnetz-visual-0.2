import * as THREE from 'three';

const NOTES = ['C', 'C#/Db', 'D', 'D#/Eb', 'E', 'F', 'F#/Gb', 'G', 'G#/Ab', 'A', 'A#/Bb', 'B'];

export class TonnetzGrid {
    constructor(scene) {
        this.scene = scene;
        this.nodes = new Map();
        this.connections = [];
        this.triads = [];
        // Usar BufferGeometry para los nodos (más eficiente)
        this.nodeGeometry = new THREE.IcosahedronGeometry(0.45, 2); // BufferGeometry es el default en versiones recientes
        this.nodeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        this.connectionMaterial = new THREE.MeshBasicMaterial({ color: 0x666666 });
        this.triadMaterial = new THREE.MeshBasicMaterial({ color: 0x8888ff, transparent: true, opacity: 0.25 });
        this.nodeNotes = new Map();
        this.generateGrid();
    }

    createNoteLabel(note) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 128;
        canvas.height = 128;

        // Fondo transparente
        context.fillStyle = 'rgba(0, 0, 0, 0)';
        context.fillRect(0, 0, canvas.width, canvas.height);

        // Texto
        context.font = 'bold 48px Arial';
        context.fillStyle = '#ffffff';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(note, canvas.width/2, canvas.height/2);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(1, 1, 1);
        return sprite;
    }

    generateGrid() {
        // Definir vectores base según el documento
        const v1 = new THREE.Vector3(1, 0, 0); // quinta justa
        const v2 = new THREE.Vector3(0.5, Math.sqrt(3)/2, 0); // tercera mayor

        // Generar nodos en una cuadrícula triangular
        const gridSize = 5; // Tamaño de la cuadrícula
        const scale = 1.5; // Factor de escala para mejor visualización

        // Crear nodos
        for (let i = -gridSize; i <= gridSize; i++) {
            for (let j = -gridSize; j <= gridSize; j++) {
                // Calcular posición usando combinación lineal de vectores base
                const position = new THREE.Vector3()
                    .addScaledVector(v1, i * scale)
                    .addScaledVector(v2, j * scale);

                // Usar InstancedMesh para eficiencia si hay muchos nodos (opcional, aquí solo BufferGeometry)
                const node = new THREE.Mesh(this.nodeGeometry, this.nodeMaterial.clone());
                node.position.copy(position);
                node.userData = { type: 'node' };
                this.scene.add(node);

                const nodeId = `${i}-${j}`;
                this.nodes.set(nodeId, node);

                // Calcular nota usando la fórmula del documento
                const noteIndex = ((7 * i + 4 * j) % 12 + 12) % 12;
                const note = NOTES[noteIndex];
                this.nodeNotes.set(nodeId, note);

                // Crear y posicionar etiqueta
                const label = this.createNoteLabel(note);
                label.position.copy(position);
                label.position.z += 0.5; // Posicionar ligeramente encima del nodo
                this.scene.add(label);
            }
        }

        // Crear conexiones y triángulos
        for (let i = -gridSize; i < gridSize; i++) {
            for (let j = -gridSize; j < gridSize; j++) {
                const currentId = `${i}-${j}`;
                const rightId = `${i+1}-${j}`;
                const upId = `${i}-${j+1}`;
                const diagId = `${i+1}-${j+1}`;

                const current = this.nodes.get(currentId);
                const right = this.nodes.get(rightId);
                const up = this.nodes.get(upId);
                const diag = this.nodes.get(diagId);

                if (current && right && up) {
                    // Triángulo superior
                    this.createConnection(current, right);
                    this.createConnection(current, up);
                    this.createConnection(right, up);
                    this.createTriad([current, right, up]);
                }

                if (right && up && diag) {
                    // Triángulo inferior
                    this.createConnection(right, up);
                    this.createConnection(right, diag);
                    this.createConnection(up, diag);
                    this.createTriad([right, up, diag]);
                }
            }
        }
    }

    createConnection(node1, node2) {
        const geometry = new THREE.BufferGeometry();
        geometry.setFromPoints([node1.position, node2.position]);
        geometry.computeLineDistances();

        const material = this.connectionMaterial.clone();
        const line = new THREE.Line(geometry, material);
        this.scene.add(line);
        this.connections.push(line);
    }

    createTriad(nodes) {
        // Calcular el centro del triángulo
        const center = new THREE.Vector3();
        nodes.forEach(n => center.add(n.position));
        center.divideScalar(3);

        // Determinar si es un acorde mayor o menor basado en la posición de los nodos
        const [n1, n2, n3] = nodes;
        const v1 = new THREE.Vector3().subVectors(n2.position, n1.position);
        const v2 = new THREE.Vector3().subVectors(n3.position, n1.position);
        const cross = new THREE.Vector3().crossVectors(v1, v2);
        
        // Si el producto cruz apunta hacia arriba (z > 0), es un acorde mayor
        const isMajor = cross.z > 0;

        // Crear geometría del triángulo
        const geometry = new THREE.CircleGeometry(0.5, 32);
        const material = this.triadMaterial.clone();
        material.color.set(isMajor ? 0xff0000 : 0x0000ff); // Rojo para mayor, azul para menor

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(center);
        mesh.userData = { 
            type: 'triad', 
            nodes,
            isMajor
        };

        // Orientar el triángulo
        mesh.lookAt(mesh.position.x, mesh.position.y, mesh.position.z + 1);
        if (!isMajor) {
            mesh.rotateZ(Math.PI); // Rotar 180 grados para acordes menores
        }

        this.scene.add(mesh);
        this.triads.push(mesh);
    }
}