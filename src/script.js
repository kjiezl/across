"strict mode";

const counterDOM = $("#counter");
const endDOM = $("#end");
const pauseDOM = $(".pause-container");
const menuDOM = $(".main-menu-container");
const timerEndDOM = $(".timer-end-container");
// const prizeAmountDOM = $("#prize-amount");
const playerCountDOM = $("#player-count");
const winDOM = $(".win-container");

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

var gameWon = false;

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
const vechicleColors = [0xFEDC03, 0x7CDA01, 0x0D8DFF, 0xFF950C, 0xB02FF7, 0xF02C03];
const threeHeights = [20, 45, 60];

var laneGoal = [];
var laneGoalNum;

var dead = false;
var inMenu = true;
var timerEnded = false;
var inCountdown = false;

var timerCount;
var gamePaused = false;
var remainingTime = 0;
var endTime = 0;
var updateTimerReq;

// var price = 15;
// var prizePercentage = 35;
// var minPercentage = 10;
// var decreaseRate = 5;
// var perPlayer = 10;
// var playedCount = 0;

let sfx = {
    hop1: new Howl({
        src: ["/src/sfx/hop2.wav"]
    }),
    death: new Howl({
        src: ["/src/sfx/death2.mp3"],
        volume: 0.1
    }),
    click: new Howl({
        src: ["/src/sfx/button-click.mp3"]
    }),
    pause: new Howl({
        src: ["/src/sfx/pause.wav"]
    }),
    timerEnd: new Howl({
        src: ["/src/sfx/timer-end.mp3"]
    }),
    timerSFX: new Howl({
        src: ["/src/sfx/timer-count.mp3"]
    }),
    laneReachedSFX: new Howl({
        src: ["/src/sfx/lane-reached.mp3"]
    })
}

let bgm = {
    bgm1: new Howl({
        src: ["/src/bgm/bgm1.mp3"]
    })
}

const initializeValues = () => {
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

    if(!inMenu) startTimer(timerCount);

    // for (let i = 1; i <= 300 + 1; i++) {
    //     if (i % laneGoalNum === 0) {
    //         laneGoal.push(i);
    //     }
    // }
    // laneReached(laneGoal);
};

initializeValues();

const spawnPlayer = () => {
    if (dead) {        
        dead = false;
        player = new Player();
        scene.add(player);
        
        initializeValues();
        
        dirLight.target = player;
        
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
    return loadModel('assets/Small Plant.glb', 0x00ff00, 0.2, 0.9, 3 * zoom);
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

function laneReached() {
    const lineMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        opacity: 0.25,
        transparent: true,
        depthWrite: false,
    });

    laneGoal.forEach((lane) => {
        const lineGeometry = new THREE.PlaneBufferGeometry(boardWidth * zoom, 10 * zoom);
        const whiteLine = new THREE.Mesh(lineGeometry, lineMaterial);
    
        whiteLine.position.y = lane * positionWidth * zoom;
        whiteLine.position.z = 10 * zoom;
    
        whiteLine.userData.isNonInteractive = true; 
        whiteLine.userData.isWhiteLine = true;
    
        scene.add(whiteLine);
    })
}

function clearLines() {
    const whiteLinesToRemove = [];

    scene.traverse((object) => {
        if (object.userData.isWhiteLine) {
            whiteLinesToRemove.push(object);
        }
    });

    whiteLinesToRemove.forEach((whiteLine) => {
        scene.remove(whiteLine);
        whiteLine.geometry.dispose();
        whiteLine.material.dispose();
    });
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

            this.plants = [1, 2, 3].map(() => {
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

            this.speed = laneSpeeds[Math.floor(Math.random() * laneSpeeds.length)];
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

// $(".play-button").click(startGame);

function startGame(goal, countdown){
    $(".countdown-start").css("visibility", "hidden");
    laneGoal = [];   
    clearLines();
    laneGoalNum = goal;
    timerCount = (countdown + 1);
    inMenu = false;
    if(!bgm.bgm1.playing()) bgm.bgm1.play();
    sfx.timerSFX.stop();
    laneGoal.push(laneGoalNum);
    laneReached(laneGoal);
    startTimer(timerCount);
}

$(".resume-button").click(pauseGame);

$("button, .musicOn, .musicOff").click(() => {sfx.click.play()});

$(".music-toggle").click(() => {
    bgm.bgm1.playing() ? bgm.bgm1.pause() : bgm.bgm1.play();
    $(".musicOn").toggle();
    $(".musicOff").toggle();
})

$(".main-menu-button").click(gotoMenu);

$(".level1-button").click(() => {startCountdown(50, 30)})
$(".level2-button").click(() => {startCountdown(100, 45)})
$(".level3-button").click(() => {startCountdown(140, 60)})

$(window).keydown((event) => {
    // if(event.code === "Space" && inMenu){
    //     menuDOM.css("visibility", "hidden");
    //     inMenu = false;
    //     if(!bgm.bgm1.playing()) bgm.bgm1.play();
    //     startTimer(timerCount);
    // }
    // if(event.key === "-") playedCount--;
    // if(event.key === "=") playedCount++;
    if(inMenu) return;
    if(event.key == "p") pauseGame();
    if(gamePaused || dead || gameWon) return;
    if(startMoving) return;
    if (event.key == "w" || event.key == "ArrowUp") move("forward");
    else if (event.key == "s" || event.key == "ArrowDown") move("backward");
    else if (event.key == "a" || event.key == "ArrowLeft") move("left");
    else if (event.key == "d" || event.key == "ArrowRight") move("right");
})

function move(direction) {
    // for(let i = 0; i <= laneGoal.length; i++){
    //     if(counterDOM.text() == laneGoal[i]){
    //         if(!sfx.laneReachedSFX.playing()) sfx.laneReachedSFX.play();
    //     }
    // }
    
    sfx.hop1.play();
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
    // if(startMoving){
    //     moves.push(direction);
    // }

    moves.push(direction);
}

function animate(timestamp) {
    requestAnimationFrame(animate);

    if (!previousTimestamp) previousTimestamp = timestamp;
    const delta = timestamp - previousTimestamp;
    previousTimestamp = timestamp;

    lanes.forEach((lane) => {
        if ((lane.type === "car" || lane.type === "car2") && !gamePaused) {
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
                    counterDOM.text(currentLane);
                    break;
                }
                case "backward": {
                    currentLane--;
                    counterDOM.text(currentLane);
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
            if (!dead && playerMaxX > carMinX && playerMinX < carMaxX){
                if(gameWon) return;
                gameOver();
            }
        });
    }
    renderer.render(scene, camera);

    // let result = calculatePrizeAmount(playedCount);
    // prizeAmountDOM.text("P " + Math.floor(result.prizeAmount));
    // playerCountDOM.text(playedCount);

    if(counterDOM.text() == laneGoal){
        winGame();
        pauseGame();
        pauseDOM.css("visibility", "hidden");
        $(".score-text").text(counterDOM.text());
    }
}

requestAnimationFrame(animate);

function winGame(){
    gameWon = true;
    winDOM.css("visibility", "visible");
    scene.remove(player);
}

function gameOver(){
    sfx.death.play();
    endDOM.css("visibility", "visible");
    $(".score-text").text(counterDOM.text());
    if (!dead) shakeCamera(camera);
    $("#timer").text("0");
    scene.remove(player);
    setTimeout(() => {
        dead = true;
    }, 150);
}

function gotoMenu(){
    endDOM.css("visibility", "hidden");
    if(sfx.timerSFX.playing) sfx.timerSFX.stop();
    menuDOM.css("visibility", "visible");
    inMenu = true;
    if(bgm.bgm1.playing()){
        bgm.bgm1.stop();
    } else{
        $(".musicOn").toggle();
        $(".musicOff").toggle();
    }
    $("#timer").text(timerCount - 1);
    restartGame();
}

function restartGame(){
    sfx.click.play();
    if(gamePaused){
        if(!gameWon) scene.remove(player);
        dead = true;
        pauseGame();
        pauseDOM.css("visiblity", "hidden");
    }
    lanes.forEach((lane) => scene.remove(lane.mesh));
    spawnPlayer();
    if(gameWon) winDOM.css("visibility", "hidden");
    timerEnded ? timerEndDOM.css("visibility", "hidden") : endDOM.css("visibility", "hidden");
    timerEnded = false;
    gameWon = false;
    counterDOM.text(0);
}

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

function startTimer(duration) {
    remainingTime = duration;
    endTime = window.performance.now() + duration * 1000;

    function updateTimer() {
        if(gamePaused || gameWon) return;
        if(dead){
            sfx.timerSFX.stop();
            return; 
        }

        const now = window.performance.now();
        remainingTime = Math.max(0, Math.floor((endTime - now) / 1000));

        $("#timer").text(remainingTime);

        if (!dead && remainingTime > 0) {
            updateTimerReq = requestAnimationFrame(updateTimer);
            if(remainingTime < 12 && remainingTime > 0){
                if(!sfx.timerSFX.playing() && !dead){
                    sfx.timerSFX.play();
                }
            }
        } else {
            countdownReached();
        }
    }

    updateTimer();
}

function startCountdown(lane, time, duration = 4) {
    menuDOM.css("visibility", "hidden");
    $(".countdown-start").css("visibility", "visible");
    sfx.timerSFX.play();

    remainingTime = duration;
    endTime = window.performance.now() + duration * 1000;

    function updateTimer() {
        if(gamePaused) return;
        if(gameWon) return;

        const now = window.performance.now();
        remainingTime = Math.max(0, Math.floor((endTime - now) / 1000));

        $(".countdown-start").text(remainingTime);

        if (remainingTime > 0) {
            updateTimerReq = requestAnimationFrame(updateTimer);
        } else {
            startGame(lane, time);
        }
    }

    updateTimer();
}

function pauseGame(){
    sfx.pause.play();
    if(!gamePaused){
        gamePaused = true;
        if(sfx.timerSFX.stop());
        if(!gameWon) pauseDOM.css("visibility", "visible");
        if(updateTimerReq) cancelAnimationFrame(updateTimerReq);
    } else{
        gamePaused = false;
        if(sfx.timerSFX.play());
        pauseDOM.css("visibility", "hidden");
        endTime = window.performance.now() + remainingTime * 1000;
        startTimer(remainingTime);
    }
    
}

function countdownReached(){
    if(dead) return;
    timerEnded = true;
    sfx.timerSFX.stop();
    sfx.timerEnd.play();
    timerEndDOM.css("visibility", "visible");
    $(".score-text").text(counterDOM.text());
    $("#timer").text("0");
    scene.remove(player);
    setTimeout(() => {
        dead = true;
    }, 150);
}

// function calculateTotalAmount(players) {
//     return players * price;
// }

// function calculatePrizeAmount(players) {
//     let tiers = Math.floor(players / perPlayer);
    
//     let currentPrizePercentage = prizePercentage - (tiers * decreaseRate);
    
//     if (currentPrizePercentage < minPercentage) {
//         currentPrizePercentage = minPercentage;
//     }

//     let totalAmount = calculateTotalAmount(players);
//     let prizeAmount = (totalAmount * currentPrizePercentage) / 100;

//     let earned = totalAmount - prizeAmount;
//     let myEarn = earned * 0.50;
    
//     return {
//         prizeAmount: prizeAmount,
//         totalAmount: totalAmount,
//         prizePercentage: currentPrizePercentage,
//         moneyEarned: earned,
//         myEarn: myEarn
//     };
// }