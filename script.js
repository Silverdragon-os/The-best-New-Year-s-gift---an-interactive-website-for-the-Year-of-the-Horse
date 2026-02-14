import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const CONFIG = {
    particleCount: isMobile ? 6000 : 15000, 
    horseScale: 0.14, 
    photoCount: 30,
    bloomStrength: isMobile ? 1.5 : 2.2,
    bloomRadius: 0.6,
    bloomThreshold: 0,
    horseImageUrl: '', 
    galleryImages: [] 
};

class EtherealSynth {
    constructor() {
        this.ctx = null;
        this.isMuted = true;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        this.isMuted = false;
        if(this.ctx.state === 'suspended') this.ctx.resume();
    }

    toggleMute() {
        if(!this.ctx) this.init();
        this.isMuted = !this.isMuted;
        return this.isMuted;
    }

    playForm() {
        if (this.isMuted || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 1.5);
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 1.0);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.5);
        osc.start();
        osc.stop(this.ctx.currentTime + 1.5);
    }

    playExplode() {
        if (this.isMuted || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
    }
}

let scene, camera, renderer, composer, controls;
let bloomPass; 
let targetBloomStrength = CONFIG.bloomStrength; 
let particles, particleMaterial;
let photoGroup;
let handLandmarker, webcam;
let appState = 'SCATTERED'; 
let time = 0;
let manualMode = false;
let fistHoldFrames = 0;
let hasInteracted = false; 

const horsePoints = []; 
const auraPoints = []; 
const originalPositions = [];
const galleryPositions = []; 
const photos = [];
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let focusedPhoto = null; 
const synth = new EtherealSynth();

const statusPill = document.getElementById('status-pill');
const statusText = document.getElementById('status-text');
const gestureIcon = document.getElementById('gesture-icon');
const detectIndicator = document.getElementById('detect-indicator');
const loadingScreen = document.getElementById('loading-screen');
const loadingText = document.getElementById('loading-text');
const dimmerEl = document.getElementById('overlay-dimmer');
const closeBtn = document.getElementById('close-btn');
const manualBtn = document.getElementById('manual-btn');
const audioBtn = document.getElementById('audio-btn');
const gestureGuide = document.getElementById('gesture-guide');

async function init() {
    initThree();
    initPostProcessing();
    await generateHorseData();
    createParticles();
    createPhotos();
    setupInteraction();
    try {
        await initMediaPipe();
    } catch (e) {
        console.error(e);
        fallbackToManual("Vision Model Failed. Using Manual Mode.");
    }
    animate();
}

function fallbackToManual(msg) {
    loadingText.innerText = msg || "Switching to Manual Mode";
    statusText.innerText = "Click Button to Start";
    manualBtn.classList.add('active');
    manualBtn.innerText = "👆 Start Now";
    setTimeout(() => loadingScreen.remove(), 1000);
    hideGuide();
}

function initThree() {
    const container = document.getElementById('canvas-container');
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x1a0505, 0.02); 
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 45);
    renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 2));
    renderer.toneMapping = THREE.ReinhardToneMapping;
    container.appendChild(renderer.domElement);
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    window.addEventListener('resize', onWindowResize);
}

function initPostProcessing() {
    const renderScene = new RenderPass(scene, camera);
    bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = CONFIG.bloomThreshold;
    bloomPass.strength = CONFIG.bloomStrength;
    bloomPass.radius = CONFIG.bloomRadius;
    composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);
}

function generateHorseData() {
    return new Promise((resolve) => {
        generateFallbackHorse();
        resolve();
    });
}

function generateFallbackHorse() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const size = 400; canvas.width = size; canvas.height = size;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000'; ctx.font = 'bold 260px "Segoe UI", sans-serif'; 
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🐎', size / 2, size / 2 + 20);
    const imgData = ctx.getImageData(0, 0, size, size).data;
    const tempPoints = []; const tempAura = [];
    const step = isMobile ? 3 : 2;
    for (let y = 0; y < size; y += step) {
        for (let x = 0; x < size; x += step) {
            if (imgData[(y * size + x) * 4] < 128) {
                    const px = (x - size / 2) * CONFIG.horseScale;
                    const py = -(y - size / 2) * CONFIG.horseScale;
                    tempPoints.push(new THREE.Vector3(px, py, (Math.random() - 0.5) * 6));
                    if(Math.random() > 0.90) tempAura.push(new THREE.Vector3(px, py, 0));
            }
        }
    }
    fillPoints(tempPoints, tempAura);
}

function fillPoints(tempPoints, tempAura) {
    horsePoints.length = 0; auraPoints.length = 0;
    if (tempPoints.length === 0) tempPoints.push(new THREE.Vector3(0,0,0));
    for (let i = 0; i < CONFIG.particleCount; i++) {
        if (i < CONFIG.particleCount * 0.8) {
            const base = tempPoints[i % tempPoints.length];
            horsePoints.push(base.clone().add(new THREE.Vector3((Math.random()-0.5)*0.2, (Math.random()-0.5)*0.2, (Math.random()-0.5)*0.2)));
        } else {
            auraPoints.push(tempAura.length > 0 ? tempAura[i % tempAura.length] : horsePoints[i % horsePoints.length].clone());
            horsePoints.push(new THREE.Vector3(0,0,0)); 
        }
    }
}

function createParticles() {
    const geometry = new THREE.BufferGeometry();
    const positions = []; const sizes = []; const colors = [];
    const colorObj = new THREE.Color();
    const bodyCount = Math.floor(CONFIG.particleCount * 0.8);

    for (let i = 0; i < CONFIG.particleCount; i++) {
        const x = (Math.random() - 0.5) * 150;
        const y = (Math.random() - 0.5) * 150;
        const z = (Math.random() - 0.5) * 150;
        positions.push(x, y, z);
        originalPositions.push(new THREE.Vector3(x, y, z));
        if (i < bodyCount) {
            const type = Math.random();
            if (type > 0.6) colorObj.setHex(0xFFD700); 
            else if (type > 0.2) colorObj.setHSL(0.98, 1.0, 0.5 + Math.random() * 0.3); 
            else colorObj.setHex(0xFFFFE0); 
            sizes.push(Math.random() * 0.5 + 0.1);
        } else {
            colorObj.setHex(0xFFD700); 
            sizes.push(Math.random() * 0.3 + 0.05);
        }
        colors.push(colorObj.r, colorObj.g, colorObj.b);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

    const sprite = getSprite();
    particleMaterial = new THREE.PointsMaterial({
        size: 0.5, map: sprite, vertexColors: true,
        blending: THREE.AdditiveBlending, depthWrite: false,
        transparent: true, opacity: 0.95
    });
    particles = new THREE.Points(geometry, particleMaterial);
    scene.add(particles);
}

function getSprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.2, 'rgba(255,200,150,0.8)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(canvas);
}

function createPhotos() {
    photoGroup = new THREE.Group();
    photoGroup.visible = false;
    scene.add(photoGroup);
    const loader = new THREE.TextureLoader();
    const phi = Math.PI * (3 - Math.sqrt(5)); 
    for (let i = 0; i < CONFIG.photoCount; i++) {
        const y = 1 - (i / (CONFIG.photoCount - 1)) * 2;
        const radius = Math.sqrt(1 - y * y);
        const theta = phi * i;
        const tx = Math.cos(theta) * radius * 25;
        const ty = y * 25;
        const tz = Math.sin(theta) * radius * 25;
        galleryPositions.push(new THREE.Vector3(tx, ty, tz));
        
        loader.load(`https://picsum.photos/400/600?random=${i+99}`, (tex) => {
            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 5), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, transparent: true }));
            mesh.userData = { id: i, galleryPos: new THREE.Vector3(tx, ty, tz), galleryRot: new THREE.Euler(0, 0, 0), isFocused: false };
            mesh.lookAt(0, 0, 0); mesh.userData.galleryRot = mesh.rotation.clone();
            photoGroup.add(mesh); photos.push(mesh);
        });
    }
}

function setupInteraction() {
    window.addEventListener('pointermove', (e) => {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });
    window.addEventListener('click', onClick);
    closeBtn.addEventListener('click', (e) => { e.stopPropagation(); unfocusPhoto(); });
    manualBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleManualState(); });
    audioBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isMuted = synth.toggleMute();
        audioBtn.innerText = isMuted ? "🔇 Audio Off" : "🔊 Audio On";
        audioBtn.classList.toggle('active', !isMuted);
    });
}

function hideGuide() {
    if (!hasInteracted) {
        gestureGuide.style.opacity = 0;
        hasInteracted = true;
        setTimeout(() => gestureGuide.remove(), 1000);
    }
}

function toggleManualState() {
    manualMode = true;
    manualBtn.classList.add('active');
    detectIndicator.style.backgroundColor = '#00aaff'; 
    hideGuide(); 
    if (appState === 'SCATTERED' || appState === 'EXPLODING' || appState === 'GALLERY') {
        appState = 'FORMING';
        synth.playForm(); 
        updateStatus('fist');
        if (focusedPhoto) unfocusPhoto();
        manualBtn.innerText = "🖐️ Open Palm to Bloom";
    } else {
        appState = 'EXPLODING';
        synth.playExplode(); 
        updateStatus('palm');
        manualBtn.innerText = "✊ Fist to Summon";
        setTimeout(() => { if (appState === 'EXPLODING') { appState = 'GALLERY'; updateStatus('viewing'); } }, 1500);
    }
}

function onClick() {
    if(synth.ctx && synth.ctx.state === 'suspended') synth.ctx.resume();
    if (appState !== 'GALLERY') return;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(photos);
    if (intersects.length > 0) focusPhoto(intersects[0].object);
    else if (focusedPhoto) unfocusPhoto();
}

function focusPhoto(mesh) {
    if (focusedPhoto && focusedPhoto !== mesh) focusedPhoto.userData.isFocused = false;
    focusedPhoto = mesh; mesh.userData.isFocused = true;
    dimmerEl.style.background = 'rgba(0,0,0,0.8)';
    updateStatus("viewing");
    closeBtn.classList.add('visible');
    targetBloomStrength = 0.1; 
}

function unfocusPhoto() {
    if (focusedPhoto) { focusedPhoto.userData.isFocused = false; focusedPhoto = null; }
    dimmerEl.style.background = 'rgba(0,0,0,0)';
    updateStatus("palm");
    closeBtn.classList.remove('visible');
    targetBloomStrength = CONFIG.bloomStrength;
}

async function initMediaPipe() {
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task", delegate: "GPU" },
        runningMode: "VIDEO", numHands: 1
    });
    await startWebcam();
}

function startWebcam() {
    return new Promise((resolve, reject) => {
        webcam = document.getElementById('webcam');
        const constraints = { video: { width: 320, height: 240, facingMode: "user" } };
        navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
            webcam.srcObject = stream;
            webcam.addEventListener('loadeddata', () => {
                loadingScreen.style.opacity = 0;
                setTimeout(() => loadingScreen.remove(), 1000);
                updateStatus("scattered");
                resolve();
            });
        }).catch((err) => { reject(err); });
    });
}

function updateStatus(state) {
    statusPill.classList.remove('active');
    if (state === 'scattered') {
        statusText.innerText = "Make Fist ✊ to Summon"; gestureIcon.innerText = "✊";
    } else if (state === 'fist') {
        statusText.innerText = "Steed Summoned • Preparing"; gestureIcon.innerText = "🐎"; statusPill.classList.add('active');
    } else if (state === 'palm') {
        statusText.innerText = "Blossom Bloom • Peace & Joy"; gestureIcon.innerText = "🌸"; statusPill.classList.add('active');
    } else if (state === 'viewing') {
        statusText.innerText = "Viewing Photo • Click to Close"; gestureIcon.innerText = "🖼️";
    }
}

function animate() {
    requestAnimationFrame(animate);
    time += 0.01;
    if (bloomPass) bloomPass.strength += (targetBloomStrength - bloomPass.strength) * 0.05;
    if (!manualMode && handLandmarker && webcam && webcam.readyState === 4) {
        const results = handLandmarker.detectForVideo(webcam, performance.now());
        handleGesture(results);
    }
    updateParticles();
    updatePhotos();
    controls.autoRotate = !focusedPhoto;
    controls.update();
    composer.render();
}

function handleGesture(results) {
    if (manualMode || appState === 'EXPLODING') return;
    if (results.landmarks && results.landmarks.length > 0) {
        detectIndicator.classList.add('detected');
        const lm = results.landmarks[0];
        const wrist = lm[0];
        const tips = [8, 12, 16, 20]; 
        let distSum = 0;
        tips.forEach(i => { const dx = lm[i].x - wrist.x; const dy = lm[i].y - wrist.y; distSum += Math.sqrt(dx*dx + dy*dy); });
        const avgDist = distSum / 4;
        
        if (avgDist < 0.28) { 
            fistHoldFrames++;
            if (fistHoldFrames > 15 && appState !== 'FORMING' && appState !== 'FORMED') {
                appState = 'FORMING'; synth.playForm(); hideGuide(); updateStatus("fist"); if (focusedPhoto) unfocusPhoto();
            }
        } else {
            fistHoldFrames = 0;
            if (avgDist > 0.40 && (appState === 'FORMED' || appState === 'FORMING')) {
                appState = 'EXPLODING'; synth.playExplode(); hideGuide(); updateStatus("palm"); 
                setTimeout(() => { if (appState === 'EXPLODING') { appState = 'GALLERY'; updateStatus('viewing'); } }, 1500);
            }
        }
    } else {
        detectIndicator.classList.remove('detected');
        fistHoldFrames = 0;
    }
}

function updateParticles() {
    const positions = particles.geometry.attributes.position.array;
    const bodyCount = Math.floor(CONFIG.particleCount * 0.8);
    for (let i = 0; i < CONFIG.particleCount; i++) {
        const ix = i * 3;
        let tx, ty, tz;
        if (appState === 'FORMING' || appState === 'FORMED') {
            if (i < bodyCount) {
                const hp = horsePoints[i % horsePoints.length];
                const breath = 1 + Math.sin(time * 2) * 0.01;
                tx = hp.x * breath + Math.sin(time * 3 + i) * 0.05;
                ty = hp.y * breath + Math.cos(time * 2 + i) * 0.05;
                tz = hp.z * breath + Math.sin(time * 4 + i) * 0.05;
            } else {
                const ap = auraPoints[(i - bodyCount) % auraPoints.length];
                tx = ap.x - 2.0 + Math.sin(time * 5 + i) * 0.5;
                ty = ap.y + Math.sin(time * 3 + i) * 0.2;
                tz = ap.z + Math.cos(time * 4 + i) * 0.2;
            }
        } else if (appState === 'EXPLODING') {
            const exp = (i < bodyCount) ? 1.08 : 1.15;
            tx = positions[ix] * exp; ty = positions[ix+1] * exp; tz = positions[ix+2] * exp;
        } else {
            tx = originalPositions[i].x + Math.sin(time * 0.5 + i) * 5;
            ty = originalPositions[i].y + Math.cos(time * 0.3 + i) * 5;
            tz = originalPositions[i].z;
        }
        const spd = (appState === 'EXPLODING') ? 0.1 : 0.08;
        positions[ix] += (tx - positions[ix]) * spd;
        positions[ix+1] += (ty - positions[ix+1]) * spd;
        positions[ix+2] += (tz - positions[ix+2]) * spd;
    }
    particles.geometry.attributes.position.needsUpdate = true;
}

function updatePhotos() {
    if (appState === 'EXPLODING' || appState === 'GALLERY') {
        photoGroup.visible = true;
        photos.forEach((mesh, i) => {
            const ud = mesh.userData;
            let targetPos, targetRot, targetScale;
            if (ud.isFocused) {
                const cameraDir = new THREE.Vector3(); camera.getWorldDirection(cameraDir);
                targetPos = new THREE.Vector3().copy(camera.position).add(cameraDir.multiplyScalar(15));
                mesh.lookAt(camera.position); targetRot = mesh.quaternion; targetScale = 3.5; 
            } else {
                targetPos = ud.galleryPos.clone(); targetPos.y += Math.sin(time + i) * 0.8;
                const dummy = new THREE.Object3D(); dummy.position.copy(targetPos); dummy.lookAt(0,0,0); 
                targetRot = dummy.quaternion; targetScale = 1.0;
            }
            mesh.position.lerp(targetPos, 0.08);
            mesh.quaternion.slerp(targetRot, ud.isFocused ? 0.1 : 0.05);
            const ns = THREE.MathUtils.lerp(mesh.scale.x, targetScale, 0.1); mesh.scale.set(ns, ns, ns);
        });
    } else {
        photos.forEach(mesh => { mesh.position.lerp(new THREE.Vector3(0,0,0), 0.1); mesh.scale.lerp(new THREE.Vector3(0,0,0), 0.1); });
        if (photos.length > 0 && photos[0].scale.x < 0.01) photoGroup.visible = false;
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight); composer.setSize(window.innerWidth, window.innerHeight);
}

init();