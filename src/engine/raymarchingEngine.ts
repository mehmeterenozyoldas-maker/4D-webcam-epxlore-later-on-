import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import GUI from 'lil-gui';

export interface RaymarchConfig {
  source: 'Video' | 'Webcam' | 'Synthetic Brain' | 'CT Chest Phantom' | 'Custom Video';
  width: number;
  height: number;
  depth: number;
  steps: number;
  density: number;
  threshold: number;
  playback: number;
  trailLength: number;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  tint: string;
  colorMode: 'tint' | 'thermal' | 'spectral' | 'xray';
  autoRotate: boolean;
  autoRotateSpeed: number;
  showWireframe: boolean;
  showBoundingGrid: boolean;
  autoScrub: boolean;
  scrubSpeed: number;
  clipX: number; // 0 to 1
  clipY: number; // 0 to 1
  clipZ: number; // 0 to 1
  jitter: boolean;
  invertLuminance: boolean;
}

export const DEFAULT_CONFIG: RaymarchConfig = {
  source: 'Synthetic Brain',
  width: 256,
  height: 256,
  depth: 100,
  steps: 128,
  density: 2.8,
  threshold: 0.18,
  playback: 0.5,
  trailLength: 0.45,
  bloomStrength: 1.2,
  bloomRadius: 0.4,
  bloomThreshold: 0.15,
  tint: '#00ff99',
  colorMode: 'tint',
  autoRotate: true,
  autoRotateSpeed: 0.6,
  showWireframe: true,
  showBoundingGrid: true,
  autoScrub: true,
  scrubSpeed: 0.2,
  clipX: 1.0,
  clipY: 1.0,
  clipZ: 1.0,
  jitter: true,
  invertLuminance: false,
};

export interface EngineStats {
  fps: number;
  currentSlice: number;
  depth: number;
  vramBytes: number;
  activeSource: string;
  isStreaming: boolean;
}

export class RaymarchingEngine {
  public config: RaymarchConfig;
  private container: HTMLElement;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private composer!: EffectComposer;
  private bloomPass!: UnrealBloomPass;
  private gui: GUI | null = null;

  // Video / Canvas buffer
  private video!: HTMLVideoElement;
  private offscreenCanvas!: HTMLCanvasElement;
  private offscreenCtx!: CanvasRenderingContext2D;
  private data3DTexture!: THREE.Data3DTexture;
  private textureData!: Uint8Array;
  private currentSlice: number = 0;

  // 3D Objects
  private volumeMesh!: THREE.Mesh<THREE.BoxGeometry, THREE.ShaderMaterial>;
  private wireframeBox!: THREE.Mesh;
  private gridHelperGroup!: THREE.Group;

  // State
  private isRunning: boolean = false;
  private animFrameId: number | null = null;
  private lastTime: number = performance.now();
  private frameCount: number = 0;
  private currentFps: number = 60;
  private customVideoUrl: string | null = null;
  private isCustomVideo: boolean = false;
  private scrubDirection: number = 1;

  // Listeners
  public onStatsUpdate?: (stats: EngineStats) => void;
  public onError?: (errorMsg: string) => void;

  constructor(container: HTMLElement, initialConfig: Partial<RaymarchConfig> = {}) {
    this.container = container;
    this.config = { ...DEFAULT_CONFIG, ...initialConfig };
    this.init();
  }

  private init() {
    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x000508, 0.04);

    // 2. Camera
    const aspect = this.container.clientWidth / this.container.clientHeight || 1;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 100);
    this.camera.position.set(4, 3, 5);

    // 3. Renderer with WebGL2 (required for Data3DTexture & sampler3D)
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);

    // 4. Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.autoRotate = this.config.autoRotate;
    this.controls.autoRotateSpeed = this.config.autoRotateSpeed;
    this.controls.minDistance = 1.5;
    this.controls.maxDistance = 25;

    // 5. Video & Offscreen Buffer
    this.setupBaseVideoElement();
    this.setup3DTextureBuffer();

    // 6. Volumetric Raymarcher Mesh & Shader
    this.setupVolumetricRaymarcher();

    // 7. Postprocessing
    this.setupPostProcessing();

    // 8. Event listeners
    window.addEventListener('resize', this.onWindowResize);

    // Pre-populate with procedural scan so scene is immediately volumetric
    this.generateProceduralVolume('Synthetic Brain');
  }

  private setupBaseVideoElement() {
    this.video = document.createElement('video');
    this.video.crossOrigin = 'anonymous';
    this.video.loop = true;
    this.video.setAttribute('muted', '');
    this.video.setAttribute('playsinline', '');
    this.video.muted = true;
    this.video.style.display = 'none';
    document.body.appendChild(this.video);

    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = this.config.width;
    this.offscreenCanvas.height = this.config.height;
    const ctx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Could not create offscreen canvas 2d context');
    }
    this.offscreenCtx = ctx;
  }

  private setup3DTextureBuffer() {
    const size = this.config.width * this.config.height * this.config.depth * 4;
    this.textureData = new Uint8Array(size);

    this.data3DTexture = new THREE.Data3DTexture(
      this.textureData,
      this.config.width,
      this.config.height,
      this.config.depth
    );
    this.data3DTexture.format = THREE.RGBAFormat;
    this.data3DTexture.type = THREE.UnsignedByteType;
    this.data3DTexture.minFilter = THREE.LinearFilter;
    this.data3DTexture.magFilter = THREE.LinearFilter;
    this.data3DTexture.unpackAlignment = 1;
    this.data3DTexture.needsUpdate = true;
  }

  private setupVolumetricRaymarcher() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);

    const colorModeMap: Record<string, number> = {
      tint: 0,
      thermal: 1,
      spectral: 2,
      xray: 3,
    };

    const material = new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      uniforms: {
        uTexture: { value: this.data3DTexture },
        uSteps: { value: this.config.steps },
        uDensity: { value: this.config.density },
        uThreshold: { value: this.config.threshold },
        uPlayback: { value: this.config.playback },
        uTrailLength: { value: this.config.trailLength },
        uTint: { value: new THREE.Color(this.config.tint) },
        uColorMode: { value: colorModeMap[this.config.colorMode] ?? 0 },
        uClip: { value: new THREE.Vector3(this.config.clipX, this.config.clipY, this.config.clipZ) },
        uJitter: { value: this.config.jitter ? 1.0 : 0.0 },
        uInvert: { value: this.config.invertLuminance ? 1.0 : 0.0 },
      },
      vertexShader: `
        out vec3 vOrigin;
        out vec3 vDirection;

        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vOrigin = vec3(inverse(modelMatrix) * vec4(cameraPosition, 1.0));
          vDirection = position - vOrigin;
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        precision highp float;
        precision highp sampler3D;

        uniform sampler3D uTexture;
        uniform float uSteps;
        uniform float uDensity;
        uniform float uThreshold;
        uniform float uPlayback;
        uniform float uTrailLength;
        uniform vec3 uTint;
        uniform int uColorMode; // 0=tint, 1=thermal, 2=spectral, 3=xray
        uniform vec3 uClip;
        uniform float uJitter;
        uniform float uInvert;

        in vec3 vOrigin;
        in vec3 vDirection;
        out vec4 fragColor;

        // Pseudo-random generator for jittering rays to eliminate banding
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        vec2 hitBox(vec3 orig, vec3 dir) {
          vec3 box_min = vec3(-0.5);
          vec3 box_max = vec3(-0.5) + uClip; // dynamic clipping plane
          vec3 inv_dir = 1.0 / dir;
          vec3 tmin_tmp = (box_min - orig) * inv_dir;
          vec3 tmax_tmp = (box_max - orig) * inv_dir;
          vec3 tmin = min(tmin_tmp, tmax_tmp);
          vec3 tmax = max(tmin_tmp, tmax_tmp);
          float t0 = max(tmin.x, max(tmin.y, tmin.z));
          float t1 = min(tmax.x, min(tmax.y, tmax.z));
          return vec2(t0, t1);
        }

        vec3 getTransferColor(float val, vec3 baseColor) {
          if (uColorMode == 1) {
            // Thermal Colormap (black -> purple -> orange -> yellow -> white)
            vec3 c0 = vec3(0.05, 0.0, 0.15);
            vec3 c1 = vec3(0.7, 0.0, 0.3);
            vec3 c2 = vec3(1.0, 0.45, 0.0);
            vec3 c3 = vec3(1.0, 0.95, 0.6);
            if (val < 0.33) return mix(c0, c1, val * 3.0);
            if (val < 0.66) return mix(c1, c2, (val - 0.33) * 3.0);
            return mix(c2, c3, (val - 0.66) * 3.0);
          } else if (uColorMode == 2) {
            // Spectral Rainbow Cyberpunk
            return 0.5 + 0.5 * cos(6.28318 * (vec3(val, val, val) + vec3(0.0, 0.33, 0.67)));
          } else if (uColorMode == 3) {
            // Clinical X-Ray / CT Bone
            vec3 softTissue = vec3(0.15, 0.25, 0.45);
            vec3 denseBone = vec3(0.95, 0.98, 1.0);
            return mix(softTissue, denseBone, smoothstep(0.3, 0.85, val));
          }
          // Default: tinted neon medical HUD
          return baseColor;
        }

        void main() {
          vec3 rayDir = normalize(vDirection);
          vec2 bounds = hitBox(vOrigin, rayDir);

          if (bounds.x > bounds.y) discard;

          bounds.x = max(bounds.x, 0.0);

          // Jitter step position to prevent slicing wood-grain artifacts
          float offset = 0.0;
          if (uJitter > 0.5) {
            offset = hash(gl_FragCoord.xy) * (1.0 / uSteps);
          }

          vec3 p = vOrigin + (bounds.x + offset) * rayDir;
          float stepLength = (bounds.y - bounds.x) / uSteps;
          vec3 stepDist = rayDir * stepLength;

          vec4 finalColor = vec4(0.0);

          // Raymarching Loop (bounded for mobile/older GPU compatibility)
          for (int i = 0; i < 256; i++) {
            if (float(i) >= uSteps) break;

            vec3 uvw = p + 0.5;

            // Check if uvw is inside volume bounds
            if (uvw.x >= 0.0 && uvw.x <= 1.0 &&
                uvw.y >= 0.0 && uvw.y <= 1.0 &&
                uvw.z >= 0.0 && uvw.z <= 1.0) {

              vec4 sampleColor = texture(uTexture, uvw);
              float luminance = dot(sampleColor.rgb, vec3(0.299, 0.587, 0.114));

              if (uInvert > 0.5) {
                luminance = 1.0 - luminance;
              }

              // 1. ISOSURFACE EXTRACTION: Discard voxels darker than threshold
              float localAlpha = sampleColor.a * (uDensity / uSteps);
              if (luminance < uThreshold) {
                localAlpha = 0.0;
              }

              // 2. TIME TRAIL: Fade out slices not currently in playback focus
              float dist = uvw.z - uPlayback;
              float timeFade = 1.0 - smoothstep(0.0, uTrailLength, abs(dist));
              localAlpha *= max(timeFade, 0.03); // Keep ghost depth trail

              if (localAlpha > 0.001) {
                // Color transfer function
                vec3 voxelColor = getTransferColor(luminance, sampleColor.rgb * uTint);

                // Front-to-back compositing
                finalColor.rgb += (1.0 - finalColor.a) * voxelColor * localAlpha * 2.2;
                finalColor.a += (1.0 - finalColor.a) * localAlpha;

                // Early ray termination optimization
                if (finalColor.a >= 0.98) break;
              }
            }

            p += stepDist;
          }

          fragColor = finalColor;
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
    });

    this.volumeMesh = new THREE.Mesh(geometry, material);
    // Scale the 1x1 cube to 16:9 ratio and Z-depth
    this.volumeMesh.scale.set(16 / 3, 9 / 3, this.config.depth * 0.05);
    this.scene.add(this.volumeMesh);

    // Decorative wireframe box surrounding the volume
    const wireMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(this.config.tint),
      wireframe: true,
      transparent: true,
      opacity: 0.18,
    });
    this.wireframeBox = new THREE.Mesh(geometry, wireMat);
    this.wireframeBox.scale.copy(this.volumeMesh.scale);
    this.scene.add(this.wireframeBox);

    // Coordinate grid ticks
    this.setupGridHelpers();
  }

  private setupGridHelpers() {
    this.gridHelperGroup = new THREE.Group();

    // Floor grid
    const floorGrid = new THREE.GridHelper(12, 24, 0x00ff99, 0x003322);
    floorGrid.position.y = -2.2;
    (floorGrid.material as THREE.Material).transparent = true;
    (floorGrid.material as THREE.Material).opacity = 0.35;
    this.gridHelperGroup.add(floorGrid);

    this.scene.add(this.gridHelperGroup);
  }

  private setupPostProcessing() {
    const renderScene = new RenderPass(this.scene, this.camera);
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.container.clientWidth, this.container.clientHeight),
      this.config.bloomStrength,
      this.config.bloomRadius,
      this.config.bloomThreshold
    );

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderScene);
    this.composer.addPass(this.bloomPass);
  }

  public setupLilGui(targetDom?: HTMLElement): GUI {
    if (this.gui) {
      this.gui.destroy();
    }

    this.gui = new GUI({
      title: 'MRI SCANNER CONTROLS',
      container: targetDom,
      autoPlace: !targetDom,
    });

    const ioFolder = this.gui.addFolder('Source Feed');
    ioFolder
      .add(this.config, 'source', [
        'Synthetic Brain',
        'CT Chest Phantom',
        'Video',
        'Webcam',
      ])
      .name('Feed')
      .onChange((val: RaymarchConfig['source']) => this.switchSource(val));

    const scanFolder = this.gui.addFolder('Volumetric Engine');
    scanFolder
      .add(this.config, 'threshold', 0.0, 1.0, 0.01)
      .name('Isolate Brightness')
      .onChange((val: number) => this.setThreshold(val));
    scanFolder
      .add(this.config, 'density', 0.1, 10.0, 0.1)
      .name('Volume Density')
      .onChange((val: number) => this.setDensity(val));
    scanFolder
      .add(this.config, 'steps', 32, 256, 1)
      .name('Ray Quality (Steps)')
      .onChange((val: number) => this.setSteps(val));

    const timeFolder = this.gui.addFolder('Time Slider');
    timeFolder
      .add(this.config, 'playback', 0, 1, 0.01)
      .name('Z-Slice')
      .onChange((val: number) => this.setPlayback(val));
    timeFolder
      .add(this.config, 'trailLength', 0.01, 1.0, 0.01)
      .name('Trail Length')
      .onChange((val: number) => this.setTrailLength(val));
    timeFolder
      .add(this.config, 'autoScrub')
      .name('Auto Scrub')
      .onChange((val: boolean) => (this.config.autoScrub = val));

    const fxFolder = this.gui.addFolder('Hologram FX');
    fxFolder
      .addColor(this.config, 'tint')
      .name('Neon Tint')
      .onChange((val: string) => this.setTint(val));
    fxFolder
      .add(this.config, 'bloomStrength', 0.0, 3.0, 0.05)
      .name('Core Glow')
      .onChange((val: number) => this.setBloomStrength(val));

    return this.gui;
  }

  public destroyLilGui() {
    if (this.gui) {
      this.gui.destroy();
      this.gui = null;
    }
  }

  // --- SOURCE SWITCHING ---
  public async switchSource(type: RaymarchConfig['source'], file?: File) {
    this.config.source = type;

    // Stop webcam if active
    if (this.video.srcObject) {
      const stream = this.video.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      this.video.srcObject = null;
    }

    if (type === 'Synthetic Brain') {
      this.video.pause();
      this.generateProceduralVolume('Synthetic Brain');
      return;
    }

    if (type === 'CT Chest Phantom') {
      this.video.pause();
      this.generateProceduralVolume('CT Chest Phantom');
      return;
    }

    if (type === 'Custom Video' && file) {
      if (this.customVideoUrl) {
        URL.revokeObjectURL(this.customVideoUrl);
      }
      this.customVideoUrl = URL.createObjectURL(file);
      this.isCustomVideo = true;
      this.video.src = this.customVideoUrl;
      this.video.load();
      await this.video.play();
      return;
    }

    if (type === 'Video') {
      this.isCustomVideo = false;
      // High contrast test video
      this.video.src = 'https://threejs.org/examples/textures/sintel.mp4';
      try {
        await this.video.play();
      } catch (err: unknown) {
        const error = err as Error;
        console.warn('Direct autoplay video error, falling back to sample or user interaction:', error.message);
        // Fallback to high-contrast procedural video if network blocked
        this.generateProceduralVolume('Synthetic Brain');
        if (this.onError) {
          this.onError('External video stream restricted by browser or CORS. Switched to Synthetic Brain.');
        }
      }
      return;
    }

    if (type === 'Webcam') {
      try {
        this.video.src = '';
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
        });
        this.video.srcObject = stream;
        await this.video.play();
      } catch (err: unknown) {
        const error = err as Error;
        const msg = 'Webcam access denied or unavailable: ' + error.message + '. Falling back to Synthetic Brain.';
        if (this.onError) this.onError(msg);
        this.config.source = 'Synthetic Brain';
        this.generateProceduralVolume('Synthetic Brain');
      }
    }
  }

  // --- PROCEDURAL 3D MRI SCAN GENERATOR ---
  // Generates 100 slices of volumetric voxel anatomical phantoms
  public generateProceduralVolume(type: 'Synthetic Brain' | 'CT Chest Phantom') {
    const w = this.config.width;
    const h = this.config.height;
    const d = this.config.depth;
    const totalBytes = w * h * d * 4;

    const centerX = w * 0.5;
    const centerY = h * 0.5;

    for (let z = 0; z < d; z++) {
      const zNorm = (z / (d - 1)) * 2.0 - 1.0; // -1 to +1
      const sliceOffset = z * (w * h * 4);

      for (let y = 0; y < h; y++) {
        const yNorm = (y - centerY) / (h * 0.45);
        for (let x = 0; x < w; x++) {
          const xNorm = (x - centerX) / (w * 0.45);
          const pixelOffset = sliceOffset + (y * w + x) * 4;

          let intensity = 0;

          if (type === 'Synthetic Brain') {
            // Brain ellipsoid equation
            const r2 = xNorm * xNorm * 1.05 + yNorm * yNorm * 0.85 + zNorm * zNorm * 1.3;
            if (r2 < 1.0 && r2 > 0.05) {
              // Cortex sulci & gyri noise
              const folds =
                Math.sin(xNorm * 14.0 + Math.sin(zNorm * 10.0)) *
                Math.cos(yNorm * 14.0 + Math.cos(zNorm * 8.0)) *
                0.25;

              // Ventricles in the center
              const ventricleDist =
                Math.abs(xNorm) * 2.2 + yNorm * yNorm * 2.0 + zNorm * zNorm * 2.5;
              const isVentricle = ventricleDist < 0.28 && Math.abs(xNorm) > 0.03;

              if (isVentricle) {
                intensity = 0.05; // Dark CSF in ventricles
              } else {
                // Skull bone layer vs grey matter
                if (r2 > 0.92) {
                  intensity = 0.95; // Bright skull
                } else if (r2 > 0.88) {
                  intensity = 0.15; // Dark subdural space
                } else {
                  // Brain parenchyma
                  intensity = 0.55 + folds + (1.0 - r2) * 0.25;
                  // Central fissure
                  if (Math.abs(xNorm) < 0.02) intensity *= 0.3;
                }
              }
            }
          } else {
            // CT Chest & Ribcage Phantom
            const ribDist = xNorm * xNorm * 0.9 + yNorm * yNorm * 1.1;
            const spineDist = Math.hypot(xNorm, yNorm - 0.5);

            if (spineDist < 0.18) {
              intensity = 0.98; // Spine vertebra
            } else if (ribDist > 0.75 && ribDist < 0.92) {
              // Rib rings
              const ribRing = Math.sin(zNorm * 25.0);
              intensity = ribRing > 0.1 ? 0.9 : 0.2;
            } else if (ribDist <= 0.75) {
              // Lungs (dark) and Heart (moderately dense)
              const heartDist = Math.hypot(xNorm + 0.15, yNorm + 0.1);
              if (heartDist < 0.32 && Math.abs(zNorm) < 0.45) {
                intensity = 0.65; // Heart
              } else {
                intensity = 0.12; // Air-filled lung cavity
              }
            }
          }

          intensity = Math.min(Math.max(intensity, 0), 1);
          const byteVal = Math.floor(intensity * 255);

          this.textureData[pixelOffset] = byteVal;
          this.textureData[pixelOffset + 1] = byteVal;
          this.textureData[pixelOffset + 2] = byteVal;
          this.textureData[pixelOffset + 3] = byteVal > 0 ? 255 : 0;
        }
      }
    }

    this.data3DTexture.needsUpdate = true;
  }

  // --- PARAMETER SETTERS ---
  public setThreshold(val: number) {
    this.config.threshold = val;
    this.volumeMesh.material.uniforms.uThreshold.value = val;
  }

  public setDensity(val: number) {
    this.config.density = val;
    this.volumeMesh.material.uniforms.uDensity.value = val;
  }

  public setSteps(val: number) {
    this.config.steps = val;
    this.volumeMesh.material.uniforms.uSteps.value = val;
  }

  public setPlayback(val: number) {
    this.config.playback = val;
    this.volumeMesh.material.uniforms.uPlayback.value = val;
  }

  public setTrailLength(val: number) {
    this.config.trailLength = val;
    this.volumeMesh.material.uniforms.uTrailLength.value = val;
  }

  public setTint(hex: string) {
    this.config.tint = hex;
    this.volumeMesh.material.uniforms.uTint.value.set(hex);
    (this.wireframeBox.material as THREE.MeshBasicMaterial).color.set(hex);
  }

  public setColorMode(mode: RaymarchConfig['colorMode']) {
    this.config.colorMode = mode;
    const modeMap = { tint: 0, thermal: 1, spectral: 2, xray: 3 };
    this.volumeMesh.material.uniforms.uColorMode.value = modeMap[mode];
  }

  public setBloomStrength(val: number) {
    this.config.bloomStrength = val;
    this.bloomPass.strength = val;
  }

  public setBloomRadius(val: number) {
    this.config.bloomRadius = val;
    this.bloomPass.radius = val;
  }

  public setAutoRotate(enabled: boolean) {
    this.config.autoRotate = enabled;
    this.controls.autoRotate = enabled;
  }

  public setAutoRotateSpeed(speed: number) {
    this.config.autoRotateSpeed = speed;
    this.controls.autoRotateSpeed = speed;
  }

  public setClipping(x: number, y: number, z: number) {
    this.config.clipX = x;
    this.config.clipY = y;
    this.config.clipZ = z;
    this.volumeMesh.material.uniforms.uClip.value.set(x, y, z);
  }

  public setJitter(jitter: boolean) {
    this.config.jitter = jitter;
    this.volumeMesh.material.uniforms.uJitter.value = jitter ? 1.0 : 0.0;
  }

  public setInvert(invert: boolean) {
    this.config.invertLuminance = invert;
    this.volumeMesh.material.uniforms.uInvert.value = invert ? 1.0 : 0.0;
  }

  public setWireframe(visible: boolean) {
    this.config.showWireframe = visible;
    this.wireframeBox.visible = visible;
  }

  public setGrid(visible: boolean) {
    this.config.showBoundingGrid = visible;
    this.gridHelperGroup.visible = visible;
  }

  // --- CAMERA PRESETS ---
  public setCameraView(view: 'isometric' | 'axial' | 'coronal' | 'sagittal') {
    switch (view) {
      case 'isometric':
        this.camera.position.set(4, 3, 5);
        this.controls.target.set(0, 0, 0);
        break;
      case 'axial': // Top view (Z slice projection)
        this.camera.position.set(0, 8, 0.001);
        this.controls.target.set(0, 0, 0);
        break;
      case 'coronal': // Front view
        this.camera.position.set(0, 0, 7);
        this.controls.target.set(0, 0, 0);
        break;
      case 'sagittal': // Side view
        this.camera.position.set(7, 0, 0);
        this.controls.target.set(0, 0, 0);
        break;
    }
    this.controls.update();
  }

  public resetCamera() {
    this.setCameraView('isometric');
  }

  // Capture canvas high-res snapshot
  public takeSnapshot(): string {
    this.composer.render();
    return this.renderer.domElement.toDataURL('image/png');
  }

  // Extract 2D cross sections for the Orthogonal slice viewer
  public getOrthoSlices(): {
    axial: ImageData | null;
    coronal: ImageData | null;
    sagittal: ImageData | null;
  } {
    const w = this.config.width;
    const h = this.config.height;
    const d = this.config.depth;

    if (!this.textureData || this.textureData.length === 0) {
      return { axial: null, coronal: null, sagittal: null };
    }

    // 1. Axial slice at z = current playback slice
    const sliceZ = Math.min(
      Math.max(Math.floor(this.config.playback * (d - 1)), 0),
      d - 1
    );
    const axialData = new Uint8ClampedArray(w * h * 4);
    const zOffset = sliceZ * (w * h * 4);
    axialData.set(this.textureData.subarray(zOffset, zOffset + w * h * 4));
    const axial = new ImageData(axialData, w, h);

    // 2. Coronal slice at mid-Y
    const midY = Math.floor(h * 0.5);
    const coronalData = new Uint8ClampedArray(w * d * 4);
    for (let z = 0; z < d; z++) {
      for (let x = 0; x < w; x++) {
        const srcIdx = (z * h * w + midY * w + x) * 4;
        const dstIdx = (z * w + x) * 4;
        coronalData[dstIdx] = this.textureData[srcIdx];
        coronalData[dstIdx + 1] = this.textureData[srcIdx + 1];
        coronalData[dstIdx + 2] = this.textureData[srcIdx + 2];
        coronalData[dstIdx + 3] = 255;
      }
    }
    const coronal = new ImageData(coronalData, w, d);

    // 3. Sagittal slice at mid-X
    const midX = Math.floor(w * 0.5);
    const sagittalData = new Uint8ClampedArray(h * d * 4);
    for (let z = 0; z < d; z++) {
      for (let y = 0; y < h; y++) {
        const srcIdx = (z * h * w + y * w + midX) * 4;
        const dstIdx = (z * h + y) * 4;
        sagittalData[dstIdx] = this.textureData[srcIdx];
        sagittalData[dstIdx + 1] = this.textureData[srcIdx + 1];
        sagittalData[dstIdx + 2] = this.textureData[srcIdx + 2];
        sagittalData[dstIdx + 3] = 255;
      }
    }
    const sagittal = new ImageData(sagittalData, h, d);

    return { axial, coronal, sagittal };
  }

  // --- ANIMATION / RENDER LOOP ---
  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.animate();
  }

  public stop() {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private animate = () => {
    if (!this.isRunning) return;
    this.animFrameId = requestAnimationFrame(this.animate);

    const now = performance.now();
    this.frameCount++;
    if (now - this.lastTime >= 1000) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastTime));
      this.frameCount = 0;
      this.lastTime = now;

      if (this.onStatsUpdate) {
        this.onStatsUpdate({
          fps: this.currentFps,
          currentSlice: this.currentSlice,
          depth: this.config.depth,
          vramBytes: this.config.width * this.config.height * this.config.depth * 4,
          activeSource: this.config.source,
          isStreaming: this.video.readyState >= this.video.HAVE_CURRENT_DATA,
        });
      }
    }

    // Auto-scrub Z slice if enabled
    if (this.config.autoScrub) {
      let nextPlay = this.config.playback + 0.003 * this.config.scrubSpeed * this.scrubDirection;
      if (nextPlay > 1.0) {
        nextPlay = 1.0;
        this.scrubDirection = -1;
      } else if (nextPlay < 0.0) {
        nextPlay = 0.0;
        this.scrubDirection = 1;
      }
      this.setPlayback(nextPlay);
    }

    // Capture video/webcam frame into 3D volume buffer if playing
    if (this.video.readyState >= this.video.HAVE_CURRENT_DATA) {
      try {
        if (this.config.source === 'Webcam') {
          this.offscreenCtx.save();
          this.offscreenCtx.translate(this.config.width, 0);
          this.offscreenCtx.scale(-1, 1);
          this.offscreenCtx.drawImage(this.video, 0, 0, this.config.width, this.config.height);
          this.offscreenCtx.restore();
        } else {
          this.offscreenCtx.drawImage(this.video, 0, 0, this.config.width, this.config.height);
        }

        const imgData = this.offscreenCtx.getImageData(0, 0, this.config.width, this.config.height);
        const memoryOffset = this.currentSlice * (this.config.width * this.config.height * 4);

        this.textureData.set(imgData.data, memoryOffset);
        this.data3DTexture.needsUpdate = true;

        this.currentSlice = (this.currentSlice + 1) % this.config.depth;
      } catch {
        // Suppress frame read exceptions during resizing/seeking
      }
    }

    this.controls.update();
    this.composer.render();
  };

  private onWindowResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
  };

  public destroy() {
    this.stop();
    window.removeEventListener('resize', this.onWindowResize);
    this.destroyLilGui();

    if (this.video.srcObject) {
      const stream = this.video.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
    }
    if (this.video.parentNode) {
      this.video.parentNode.removeChild(this.video);
    }
    if (this.customVideoUrl) {
      URL.revokeObjectURL(this.customVideoUrl);
    }

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
