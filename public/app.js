import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

// 1. Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0f172a); 

// 2. Camera Setup
const container = document.getElementById('canvas-container');
const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
camera.position.set(5, 5, 5);

// 3. Renderer Setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

// 4. Controls & Environment
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const gridHelper = new THREE.GridHelper(20, 20, 0x475569, 0x334155);
gridHelper.userData.isSystem = true; 
scene.add(gridHelper);

const axesHelper = new THREE.AxesHelper(5);
axesHelper.userData.isSystem = true; 
scene.add(axesHelper);

// 4b. Setup TransformControls
const transformControls = new TransformControls(camera, renderer.domElement);
transformControls.setMode('scale'); 
transformControls.setSpace('local'); 
scene.add(transformControls);

// HIDE THE GIZMO BOXES: Make the visual helper layer invisible, keeping only the interactive interaction layer
if (transformControls.children.length > 0) {
    transformControls.children[0].visible = false; 
}

// CAMERA LOCK LOGIC: Disable orbiting entirely when Drag to Scale is active
const scaleToggle = document.getElementById('scale-toggle');
if (scaleToggle) {
    scaleToggle.addEventListener('change', (e) => {
        controls.enabled = !e.target.checked; // Camera locked!
        if (!e.target.checked) {
            transformControls.detach();
            document.body.style.cursor = 'default';
        }
    });
}

// Axis labels helper
function createAxisLabel(text, position, colorStr) {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = colorStr;
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    
    sprite.position.copy(position);
    sprite.scale.set(1.5, 1.5, 1.5);
    sprite.userData.isSystem = true; 
    scene.add(sprite);
}

createAxisLabel('X', new THREE.Vector3(5.5, 0, 0), '#ff6666');
createAxisLabel('Y', new THREE.Vector3(0, 5.5, 0), '#66ff66');
createAxisLabel('Z', new THREE.Vector3(0, 0, 5.5), '#6666ff');

function createFloatingLabel(text, colorStr) {
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = colorStr;
    ctx.font = 'bold 44px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ 
        map: texture, 
        transparent: true,
        depthTest: false 
    });
    
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1.5, 0.75, 1);
    return sprite;
}

window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
animate();

export { scene, THREE };

// --- THE EXECUTION ENGINE ---
const sceneObjects = new Map();

export async function executeCanvasCommand(command) {
    const { action, id, color, label } = command;
    const materialColor = color ? new THREE.Color(color) : new THREE.Color(0xffffff);

    try {
        if (action === 'clear_scene') {
            transformControls.detach();
            sceneObjects.forEach(obj => {
                scene.remove(obj);
                if (obj.traverse) {
                    obj.traverse(child => {
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                            else child.material.dispose();
                        }
                    });
                }
            });
            sceneObjects.clear();
            return true;
        }

        const spawnObject = (object3D) => {
            object3D.name = id;
            object3D.scale.set(0.01, 0.01, 0.01);
            scene.add(object3D);
            sceneObjects.set(id, object3D);

            return new Promise((resolve) => {
                let progress = 0;
                function grow() {
                    progress += 0.05;
                    if (progress <= 1) {
                        object3D.scale.set(progress, progress, progress);
                        requestAnimationFrame(grow);
                    } else {
                        object3D.scale.set(1, 1, 1);
                        resolve(true);
                    }
                }
                grow();
            });
        };

        if (action === 'draw_vector') {
            const { coords, origin = [0,0,0], thickness = 0.08 } = command;
            const dir = new THREE.Vector3(coords[0], coords[1], coords[2]);
            if (dir.lengthSq() === 0) dir.set(0, 1, 0); 
            const length = dir.length();
            dir.normalize();

            const start = new THREE.Vector3(origin[0], origin[1], origin[2]);
            const arrowGroup = new THREE.Group();
            arrowGroup.position.copy(start);
            arrowGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

            const material = new THREE.MeshBasicMaterial({ color: materialColor });
            const headLength = thickness * 5;
            const shaftLength = Math.max(0.1, length - headLength);
            
            const shaft = new THREE.Mesh(new THREE.CylinderGeometry(thickness, thickness, shaftLength, 12), material);
            shaft.position.y = shaftLength / 2;
            arrowGroup.add(shaft);

            const head = new THREE.Mesh(new THREE.ConeGeometry(thickness * 2.5, headLength, 12), material);
            head.position.y = shaftLength + (headLength / 2);
            arrowGroup.add(head);

            if (label) {
                const labelSprite = createFloatingLabel(label, materialColor.getStyle());
                labelSprite.position.y = length + 0.4;
                arrowGroup.add(labelSprite);
            }

            arrowGroup.userData = { type: 'vector' };
            return spawnObject(arrowGroup);
        }

        if (action === 'draw_line') {
            const { direction, origin = [0,0,0], thickness = 0.04 } = command;
            const dir = new THREE.Vector3(direction[0], direction[1], direction[2]);
            if (dir.lengthSq() === 0) dir.set(0, 1, 0);
            dir.normalize();
            
            const start = new THREE.Vector3(origin[0], origin[1], origin[2]);
            const lineGroup = new THREE.Group();
            lineGroup.position.copy(start);
            lineGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

            const material = new THREE.MeshBasicMaterial({ color: materialColor });
            const mesh = new THREE.Mesh(new THREE.CylinderGeometry(thickness, thickness, 100, 12), material);
            lineGroup.add(mesh);

            if (label) {
                const labelSprite = createFloatingLabel(label, materialColor.getStyle());
                labelSprite.position.set(0, 3, 0); 
                lineGroup.add(labelSprite);
            }

            lineGroup.userData = { type: 'line' };
            return spawnObject(lineGroup);
        }

        if (action === 'draw_point') {
            const { coords } = command;
            const material = new THREE.MeshBasicMaterial({ color: materialColor });
            const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), material);
            sphere.position.set(coords[0], coords[1], coords[2]);
            
            if (label) {
                const labelSprite = createFloatingLabel(label, materialColor.getStyle());
                labelSprite.position.set(0, 0.4, 0);
                sphere.add(labelSprite);
            }

            sphere.userData = { type: 'point' };
            return spawnObject(sphere);
        }

        if (action === 'draw_plane') {
            const { normal, origin = [0,0,0], size = 5 } = command;
            const material = new THREE.MeshBasicMaterial({ 
                color: materialColor, side: THREE.DoubleSide, transparent: true, opacity: 0.5 
            });
            const plane = new THREE.Mesh(new THREE.PlaneGeometry(size, size), material);
            plane.position.set(origin[0], origin[1], origin[2]);
            
            const normalVec = new THREE.Vector3(normal[0], normal[1], normal[2]);
            if (normalVec.lengthSq() === 0) normalVec.set(0, 1, 0);
            plane.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normalVec.normalize());
            
            if (label) {
                const labelSprite = createFloatingLabel(label, materialColor.getStyle());
                labelSprite.position.set(size/3, size/3, 0.1);
                plane.add(labelSprite);
            }

            plane.userData = { type: 'plane' };
            return spawnObject(plane);
        }

    } catch (error) {
        console.error(`Failed to execute command ${action}:`, error);
        return false;
    }
}

// --- CAMERA AUTO-FRAMING ---
export function frameScene() {
    if (sceneObjects.size === 0) {
        camera.position.set(5, 5, 5);
        controls.target.set(0, 0, 0);
        controls.update();
        return;
    }

    const box = new THREE.Box3();
    sceneObjects.forEach(obj => {
        const isInfiniteLine = obj.children.some(child => 
            child.geometry && 
            child.geometry.parameters && 
            child.geometry.parameters.height === 100
        );
        
        if (isInfiniteLine) return;
        box.expandByObject(obj);
    });

    if (box.isEmpty()) {
        box.setFromCenterAndSize(new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 10, 10));
    }

    const center = new THREE.Vector3();
    box.getCenter(center);

    const size = new THREE.Vector3();
    box.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    
    let cameraDistance = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5;
    cameraDistance = Math.max(cameraDistance, 7);

    camera.position.set(center.x + cameraDistance * 0.7, center.y + cameraDistance * 0.5, center.z + cameraDistance * 0.7);
    controls.target.copy(center);
    controls.update();
}

// --- INTERACTIVE DRAG-TO-SCALE ENGINE & RESIZE CURSOR HOVER ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('pointermove', (event) => {
    if (!scaleToggle || !scaleToggle.checked) {
        document.body.style.cursor = 'default';
        return;
    }

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const selectables = Array.from(sceneObjects.values());
    const intersects = raycaster.intersectObjects(selectables, true);

    if (intersects.length > 0) {
        let target = intersects[0].object;
        
        if (target.userData.isSystem || (target.parent && target.parent.userData.isSystem)) {
            document.body.style.cursor = 'default';
            return;
        }

        while (target.parent && !target.userData.type) {
            target = target.parent;
        }

        if (target.userData.type) {
            if (target.userData.type === 'plane') {
                document.body.style.cursor = 'ew-resize';
            } else if (target.userData.type === 'line' || target.userData.type === 'vector') {
                document.body.style.cursor = 'ns-resize';
            } else {
                document.body.style.cursor = 'pointer';
            }
            return;
        }
    }
    
    if (transformControls.dragging) {
        document.body.style.cursor = 'grabbing';
    } else {
        document.body.style.cursor = 'default';
    }
});

window.addEventListener('pointerdown', (event) => {
    if (!scaleToggle || !scaleToggle.checked) {
        transformControls.detach();
        return;
    }

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const selectables = Array.from(sceneObjects.values());
    const intersects = raycaster.intersectObjects(selectables, true);

    if (intersects.length > 0) {
        let target = intersects[0].object;
        
        if (target.userData.isSystem || (target.parent && target.parent.userData.isSystem)) {
            transformControls.detach();
            return;
        }

        while (target.parent && !target.userData.type) {
            target = target.parent;
        }

        if (target.userData.type) {
            transformControls.attach(target);

            if (target.userData.type === 'plane') {
                transformControls.showX = true;
                transformControls.showY = true;
                transformControls.showZ = false;
            } else if (target.userData.type === 'line' || target.userData.type === 'vector') {
                transformControls.showX = false;
                transformControls.showY = true;
                transformControls.showZ = false;
            } else {
                transformControls.showX = true;
                transformControls.showY = true;
                transformControls.showZ = true;
            }
        }
    } else {
        const isHoveringGizmo = transformControls.dragging || (transformControls.axis !== null);
        if (!isHoveringGizmo) {
            transformControls.detach();
        }
    }
});