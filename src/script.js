const counterDOM = document.getElementById("counter");
const endDOM = document.getElementById("end");

const scene = new THREE.Scene();

const distance = 500;
const camera = new THREE.OrthographicCamera(
    window.innerWidth / -2,
    window.innerWidth / 2,
    window.innerHeight / 2,
    window.innerHeight / -2,
    0.1,
    10000
);

camera.rotation.x = (50 * Math.PI) / 180;
camera.rotation.y = (20 * Math.PI) / 180;
camera.rotation.z = (10 * Math.PI) / 180;

const initialCameraPositionY = -Math.tan(camera.rotation.x) * distance;
const initialCameraPositionX = Math.tan(camera.rotation.y) * Math.sqrt(distance ** 2 + initialCameraPositionY ** 2);
camera.position.y = initialCameraPositionY;
camera.position.x = initialCameraPositionX;
camera.position.z = distance;

const zoom = 2;

const playerSize = 15;

const positionWidth = 42;
const columns = 17;
const boardWidth = positionWidth * columns;

const stepTime = 200;

let lanes;
let currentLane;
let currentColumn;

let previousTimestamp;
let startMoving;
let moves;
let stepStartTimestamp;

const generateLanes = () =>
    [-9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
        .map((index) => {
            const lane = new Lane(index);
            lane.mesh.position.y = index * positionWidth * zoom;
            scene.add(lane.mesh);
            return lane;
        })
        .filter((lane) => lane.index >= 0);

const addLane = () => {
    const index = lanes.length;
    const lane = new Lane(index);
    lane.mesh.position.y = index * positionWidth * zoom;
    scene.add(lane.mesh);
    lanes.push(lane);
};

var player = new Player();
scene.add(player);

hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
scene.add(hemiLight);

const initialDirLightPositionX = -100;
const initialDirLightPositionY = -100;
dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(initialDirLightPositionX, initialDirLightPositionY, 200);
dirLight.castShadow = true;
dirLight.target = player;
scene.add(dirLight);

dirLight.castShadow = true; 
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
var d = 500;
dirLight.shadow.camera.left = -d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = -d;

backLight = new THREE.DirectionalLight(0x000000, 0.4);
backLight.position.set(200, 200, 50);
backLight.castShadow = true;
scene.add(backLight);

const laneTypes = ["car", "car2", "forest"];
const laneSpeeds = [2, 2.5, 3];
const vechicleColors = [0xa52523, 0xbdb638, 0x78b14b];
const threeHeights = [20, 45, 60];

var dead = false;

const initaliseValues = () => {
    lanes = generateLanes();

    currentLane = 0;
    currentColumn = Math.floor(columns / 2);

    previousTimestamp = null;

    startMoving = false;
    moves = [];
    stepStartTimestamp;

    player.position.x = 0;
    player.position.y = 0;

    camera.position.y = initialCameraPositionY;
    camera.position.x = initialCameraPositionX;

    dirLight.position.x = initialDirLightPositionX;
    dirLight.position.y = initialDirLightPositionY;
};

initaliseValues();

const spawnPlayer = () => {
    if (dead) {        
        player = new Player();
        scene.add(player);
        
        initaliseValues();
        
        dirLight.target = player;
        
        dead = false;
    }
};

const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

function createMesh(geometry, materialOptions) {
    const material = new THREE.MeshPhongMaterial(materialOptions);
    return new THREE.Mesh(geometry, material);
}

function createGroupMesh(geometry, material, positionZ, castShadow = true, receiveShadow = true) {
    const group = new THREE.Group();
    const mesh = createMesh(geometry, material);
    mesh.position.z = positionZ;
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    group.add(mesh);
    return group;
}

function loadModel(url, color, metalness, roughness, positionZ) {
    const loader = new THREE.GLTFLoader();
    const group = new THREE.Group();

    loader.load(url, (gltf) => {
        const model = gltf.scene;
        model.rotation.x = Math.PI / 2;

        model.traverse((node) => {
            if (node.isMesh && node.material.isMeshStandardMaterial) {
                node.material.color.set(color);
                node.material.metalness = metalness;
                node.material.roughness = roughness;
                node.castShadow = true;
                node.material.needsUpdate = true;
            }
        });

        model.scale.set(30, 30, 30);
        model.position.set(0, 0, 0);
        group.add(model);

        group.position.z = positionZ;
        group.castShadow = true;
        group.receiveShadow = true;
    }, undefined, (error) => {
        console.error('Error loading the GLTF model:', error);
    });

    return group;
}

function Car() {
    const color = vechicleColors[Math.floor(Math.random() * vechicleColors.length)];
    return createGroupMesh(
        new THREE.BoxBufferGeometry(60 * zoom, 30 * zoom, 15 * zoom),
        { color, flatShading: true },
        15 * zoom
    );
}

function Car2() {
    return createGroupMesh(
        new THREE.BoxBufferGeometry(100 * zoom, 25 * zoom, 5 * zoom),
        { color: vechicleColors[Math.floor(Math.random() * vechicleColors.length)], flatShading: true },
        10 * zoom
    );
}

function Plant1() {
    return loadModel('assets/Small Plant.glb', 0x00ff00, 0.2, 0.9, 1 * zoom);
}

function Plant2() {
    return loadModel('assets/Plante.glb', 0xff0000, -5, 0.5, 3 * zoom);
}

function Plant3() {
    return loadModel('assets/Tree Floating.glb', 0x66ffff, -0.5, 0.9, 1 * zoom);
}

function Player() {
    return createGroupMesh(
        new THREE.BoxBufferGeometry(playerSize * zoom, playerSize * zoom, 20 * zoom),
        { color: 0xffffff, flatShading: true },
        10 * zoom
    );
}

function Road() {
    const createSection = (color) => 
        new THREE.Mesh(
            new THREE.PlaneBufferGeometry(boardWidth * zoom, positionWidth * zoom),
            new THREE.MeshPhongMaterial({ color })
        );

    const road = new THREE.Group();
    const colors = [0x2e2e2e, 0x1c1c1c, 0x1c1c1c];
    const positions = [0, -boardWidth * zoom, boardWidth * zoom];
    
    colors.forEach((color, i) => {
        const section = createSection(color);
        section.position.x = positions[i];
        section.receiveShadow = true;
        road.add(section);
    });

    return road;
}

function Grass() {
    const createSection = (color) => 
        new THREE.Mesh(
            new THREE.BoxBufferGeometry(boardWidth * zoom, positionWidth * zoom, 3 * zoom),
            new THREE.MeshPhongMaterial({ color })
        );

    const grass = new THREE.Group();
    const colors = [0x6a0d91, 0x5d0a81, 0x5d0a81];
    const positions = [0, -boardWidth * zoom, boardWidth * zoom];
    
    colors.forEach((color, i) => {
        const section = createSection(color);
        section.position.x = positions[i];
        section.receiveShadow = true;
        grass.add(section);
    });

    grass.position.z = 1.5 * zoom;
    return grass;
}

function Lane(index){
    this.index = index;
    this.type =
        index <= 0
            ? "field"
            : laneTypes[Math.floor(Math.random() * laneTypes.length)];

    switch (this.type) {
        case "field": {
            this.type = "field";
            this.mesh = new Grass();
            break;
        }
        case "forest": {
            this.mesh = new Grass();

            this.occupiedPositions = new Set();

            this.plants = [1, 2, 3, 4].map(() => {
                const plant = new Plant1();
                let position;
                do {
                    position = Math.floor(Math.random() * columns);
                } while (this.occupiedPositions.has(position));
                this.occupiedPositions.add(position);
                plant.position.x =
                    (position * positionWidth + positionWidth / 2) * zoom -
                    (boardWidth * zoom) / 2;
                this.mesh.add(plant);
                return plant;
            });

            this.plants = [1, 2].map(() => {
                const plant = new Plant2();
                let position;
                do {
                    position = Math.floor(Math.random() * columns);
                } while (this.occupiedPositions.has(position));
                this.occupiedPositions.add(position);
                plant.position.x =
                    (position * positionWidth + positionWidth / 2) * zoom -
                    (boardWidth * zoom) / 2;
                this.mesh.add(plant);
                return plant;
            });

            this.plants = [1].map(() => {
                const plant = new Plant3();
                let position;
                do {
                    position = Math.floor(Math.random() * columns);
                } while (this.occupiedPositions.has(position));
                this.occupiedPositions.add(position);
                plant.position.x =
                    (position * positionWidth + positionWidth / 2) * zoom -
                    (boardWidth * zoom) / 2;
                this.mesh.add(plant);
                return plant;
            });

            break;
        }
        case "car": {
            this.mesh = new Road();
            this.direction = Math.random() >= 0.5;

            const occupiedPositions = new Set();
            this.vechicles = [1, 2, 3].map(() => {
                const vechicle = new Car();
                let position;
                do {
                    position = Math.floor((Math.random() * columns) / 2);
                } while (occupiedPositions.has(position));
                occupiedPositions.add(position);
                vechicle.position.x =
                    (position * positionWidth * 2 + positionWidth / 2) * zoom -
                    (boardWidth * zoom) / 2;
                if (!this.direction) vechicle.rotation.z = Math.PI;
                this.mesh.add(vechicle);
                return vechicle;
            });

            this.speed =
                laneSpeeds[Math.floor(Math.random() * laneSpeeds.length)];
            break;
        }
        case "car2": {
            this.mesh = new Road();
            this.direction = Math.random() >= 0.5;

            const occupiedPositions = new Set();
            this.vechicles = [1, 2].map(() => {
                const vechicle = new Car2();
                let position;
                do {
                    position = Math.floor((Math.random() * columns) / 3);
                } while (occupiedPositions.has(position));
                occupiedPositions.add(position);
                vechicle.position.x =
                    (position * positionWidth * 3 + positionWidth / 2) * zoom -
                    (boardWidth * zoom) / 2;
                if (!this.direction) vechicle.rotation.z = Math.PI;
                this.mesh.add(vechicle);
                return vechicle;
            });

            this.speed = laneSpeeds[Math.floor(Math.random() * laneSpeeds.length)];
            break;
        }
    }
}

document.querySelector("#retry").addEventListener("click", () => {
    lanes.forEach((lane) => scene.remove(lane.mesh));
    spawnPlayer();
    endDOM.style.visibility = "hidden";
    counterDOM.innerHTML = 0;
});

window.addEventListener("keydown", (event) => {
    if(dead) return;
    if (event.key == "w") move("forward");
    else if (event.key == "s") move("backward");
    else if (event.key == "a") move("left");
    else if (event.key == "d") move("right");
});

function move(direction) {
    const finalPositions = moves.reduce(
        (position, move) => {
            if (move === "forward")
                return { lane: position.lane + 1, column: position.column };
            if (move === "backward")
                return { lane: position.lane - 1, column: position.column };
            if (move === "left")
                return { lane: position.lane, column: position.column - 1 };
            if (move === "right")
                return { lane: position.lane, column: position.column + 1 };
        },
        { lane: currentLane, column: currentColumn }
    );

    if (direction === "forward") {
        if (
            lanes[finalPositions.lane + 1].type === "forest" &&
            lanes[finalPositions.lane + 1].occupiedPositions.has(
                finalPositions.column
            )
        )
            return;
        if (!stepStartTimestamp) startMoving = true;
        addLane();
    } else if (direction === "backward") {
        if (finalPositions.lane === 0) return;
        if (
            lanes[finalPositions.lane - 1].type === "forest" &&
            lanes[finalPositions.lane - 1].occupiedPositions.has(
                finalPositions.column
            )
        )
            return;
        if (!stepStartTimestamp) startMoving = true;
    } else if (direction === "left") {
        if (finalPositions.column === 0) return;
        if (
            lanes[finalPositions.lane].type === "forest" &&
            lanes[finalPositions.lane].occupiedPositions.has(
                finalPositions.column - 1
            )
        )
            return;
        if (!stepStartTimestamp) startMoving = true;
    } else if (direction === "right") {
        if (finalPositions.column === columns - 1) return;
        if (
            lanes[finalPositions.lane].type === "forest" &&
            lanes[finalPositions.lane].occupiedPositions.has(
                finalPositions.column + 1
            )
        )
            return;
        if (!stepStartTimestamp) startMoving = true;
    }
    moves.push(direction);
}

function animate(timestamp) {
    requestAnimationFrame(animate);

    if (!previousTimestamp) previousTimestamp = timestamp;
    const delta = timestamp - previousTimestamp;
    previousTimestamp = timestamp;

    lanes.forEach((lane) => {
        if (lane.type === "car" || lane.type === "car2") {
            const beforeLane =
                (-boardWidth * zoom) / 2 - positionWidth * 2 * zoom;
            const afterLane =
                (boardWidth * zoom) / 2 + positionWidth * 2 * zoom;
            lane.vechicles.forEach((vechicle) => {
                if (lane.direction) {
                    vechicle.position.x =
                        vechicle.position.x < beforeLane
                            ? afterLane
                            : (vechicle.position.x -=
                                  (lane.speed / 16) * delta);
                } else {
                    vechicle.position.x =
                        vechicle.position.x > afterLane
                            ? beforeLane
                            : (vechicle.position.x +=
                                  (lane.speed / 16) * delta);
                }
            });
        }
    });

    if (startMoving) {
        stepStartTimestamp = timestamp;
        startMoving = false;
    }

    if (stepStartTimestamp) {
        const moveDeltaTime = timestamp - stepStartTimestamp;
        const moveDeltaDistance = Math.min(moveDeltaTime / stepTime, 1) * positionWidth * zoom;
        const jumpDeltaDistance = Math.sin(Math.min(moveDeltaTime / stepTime, 1) * Math.PI) * 8 * zoom;
        switch (moves[0]) {
            case "forward": {
                const positionY = currentLane * positionWidth * zoom + moveDeltaDistance;
                camera.position.y = initialCameraPositionY + positionY;
                dirLight.position.y = initialDirLightPositionY + positionY;
                player.position.y = positionY;

                player.position.z = jumpDeltaDistance;
                break;
            }
            case "backward": {
                positionY = currentLane * positionWidth * zoom - moveDeltaDistance;
                camera.position.y = initialCameraPositionY + positionY;
                dirLight.position.y = initialDirLightPositionY + positionY;
                player.position.y = positionY;

                player.position.z = jumpDeltaDistance;
                break;
            }
            case "left": {
                const positionX = (currentColumn * positionWidth + positionWidth / 2) * zoom - (boardWidth * zoom) / 2 - moveDeltaDistance;
                camera.position.x = initialCameraPositionX + positionX;
                dirLight.position.x = initialDirLightPositionX + positionX;
                player.position.x = positionX;
                player.position.z = jumpDeltaDistance;
                break;
            }
            case "right": {
                const positionX = (currentColumn * positionWidth + positionWidth / 2) * zoom - (boardWidth * zoom) / 2 + moveDeltaDistance;
                camera.position.x = initialCameraPositionX + positionX;
                dirLight.position.x = initialDirLightPositionX + positionX;
                player.position.x = positionX;

                player.position.z = jumpDeltaDistance;
                break;
            }
        }
        
        if (moveDeltaTime > stepTime) {
            switch (moves[0]) {
                case "forward": {
                    currentLane++;
                    counterDOM.innerHTML = currentLane;
                    break;
                }
                case "backward": {
                    currentLane--;
                    counterDOM.innerHTML = currentLane;
                    break;
                }
                case "left": {
                    currentColumn--;
                    break;
                }
                case "right": {
                    currentColumn++;
                    break;
                }
            }
            moves.shift();
            stepStartTimestamp = moves.length === 0 ? null : timestamp;
        }
    }

    if (lanes[currentLane].type === "car" || lanes[currentLane].type === "car2"){
        const playerMinX = player.position.x - (playerSize * zoom) / 2;
        const playerMaxX = player.position.x + (playerSize * zoom) / 2;
        const vechicleLength = { car: 60, car2: 105 }[lanes[currentLane].type];
        lanes[currentLane].vechicles.forEach((vechicle) => {
            const carMinX = vechicle.position.x - (vechicleLength * zoom) / 2;
            const carMaxX = vechicle.position.x + (vechicleLength * zoom) / 2;
            if (playerMaxX > carMinX && playerMinX < carMaxX){
                endDOM.style.visibility = "visible";
                if (!dead) shakeCamera(camera);
                scene.remove(player);
                setTimeout(() => {
                    dead = true;
                }, 150);
            }
        });
    }
    renderer.render(scene, camera);
}

requestAnimationFrame(animate);

function shakeCamera(camera, intensity = 10, duration = 1) {
    const startPosition = camera.position.clone();
    const shakeStart = Date.now();

    function shake() {
        const elapsed = Date.now() - shakeStart;
        const progress = elapsed / duration;

        if (progress < 1) {
            const shakeX = (Math.random() * 2 - 1) * intensity;
            const shakeY = (Math.random() * 2 - 1) * intensity;
            const shakeZ = (Math.random() * 2 - 1) * intensity;

            camera.position.x = startPosition.x + shakeX;
            camera.position.y = startPosition.y + shakeY;
            camera.position.z = startPosition.z + shakeZ;

            requestAnimationFrame(shake);
        } else {
            camera.position.copy(startPosition);
        }
    }
    shake();
}