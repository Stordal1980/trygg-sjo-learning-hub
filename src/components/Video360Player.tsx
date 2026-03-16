import { useRef, useEffect, useState } from "react";

const isIOSSafari = (): boolean => {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua);
  return isIOS && isSafari;
};

const isIOSDevice = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

const getIOSVersion = (): number | null => {
  const match = navigator.userAgent.match(/CPU (?:iPhone )?OS (\d+)/);
  return match ? parseInt(match[1], 10) : null;
};

interface Video360PlayerProps {
  videoUrl: string;
}

interface DebugInfo {
  state: string;
  time: number;
  dimensions: string;
  muted: boolean;
  readyState: number;
  networkState: number;
  textureStatus: string;
  sceneLoaded: boolean;
  browser: string;
  maxTexSize: number;
  texSizeOk: string;
  isIOS: boolean;
  retryCount: number;
  videoSrc: string;
  renderer: string;
}

export function Video360Player({ videoUrl }: Video360PlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videosphereRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const videoIdRef = useRef(`vid360-${Math.random().toString(36).slice(2, 9)}`);
  const [aframeLoaded, setAframeLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    state: "init",
    time: 0,
    dimensions: "0x0",
    muted: true,
    readyState: 0,
    networkState: 0,
    textureStatus: "n/a",
    sceneLoaded: false,
    browser: "",
    maxTexSize: 0,
    texSizeOk: "?",
    isIOS: false,
    retryCount: 0,
    videoSrc: "",
    renderer: "?",
  });

  useEffect(() => {
    setDebugInfo((d) => ({
      ...d,
      browser: navigator.userAgent.slice(0, 80),
      isIOS: isIOSDevice(),
      videoSrc: videoUrl.slice(0, 60),
    }));
    try {
      const c = document.createElement("canvas");
      const gl = c.getContext("webgl") || c.getContext("experimental-webgl");
      if (gl) {
        const glCtx = gl as WebGLRenderingContext;
        const max = glCtx.getParameter(glCtx.MAX_TEXTURE_SIZE);
        setDebugInfo((d) => ({ ...d, maxTexSize: max }));
        // CRITICAL: Dispose this WebGL context immediately.
        // iOS has a strict limit on simultaneous WebGL contexts (~8).
        // If we don't release it, the 360 renderer can't create its own.
        const loseCtx = glCtx.getExtension("WEBGL_lose_context");
        if (loseCtx) loseCtx.loseContext();
      }
    } catch (e) {}
  }, []);

  // Load A-Frame dynamically — but ONLY on modern browsers (iOS 15+, desktop, Android).
  // On iOS < 15, we use standalone Three.js (dynamically imported in setupThreeJsPlayer)
  // to avoid A-Frame consuming a WebGL context that we need for our own renderer.
  const iosVersion = getIOSVersion();
  const useThreeJsFallback = iosVersion !== null && iosVersion < 15;

  useEffect(() => {
    if (useThreeJsFallback) {
      // Skip A-Frame entirely — use standalone Three.js
      setAframeLoaded(true); // Signal that we're ready to render
      return;
    }
    if ((window as any).AFRAME) {
      setAframeLoaded(true);
      return;
    }
    import("aframe")
      .then(() => setAframeLoaded(true))
      .catch((err) => {
        console.error("Failed to load A-Frame:", err);
        setFatalError("Kunne ikke laste 360-spilleren. Pr\u00f8v \u00e5 oppdatere siden.");
      });
  }, []);

  // Debug interval
  useEffect(() => {
    const interval = setInterval(() => {
      const video = videoRef.current;
      const sphere = videosphereRef.current;
      const scene = sceneRef.current;

      if (video) {
        // For A-Frame path, check sphere entity
        let textureStatus = "n/a";
        if (sphere?.getObject3D) {
          const mesh = sphere.getObject3D("mesh");
          const hasMap = !!(mesh?.material?.map);
          textureStatus = mesh ? (hasMap ? "OK" : "no map") : "no mesh";
        } else if (sphere?.material) {
          // Three.js fallback path — sphere IS the mesh directly
          textureStatus = sphere.material.map ? "OK" : "no map";
        }

        const maxTex = debugInfo.maxTexSize;
        const oversized = video.videoWidth > maxTex || video.videoHeight > maxTex;

        setDebugInfo((d) => ({
          ...d,
          time: video.currentTime,
          dimensions: `${video.videoWidth}x${video.videoHeight}`,
          muted: video.muted,
          readyState: video.readyState,
          networkState: video.networkState,
          textureStatus,
          sceneLoaded: scene ? (!!(scene as any)?.hasLoaded || d.renderer === "three.js") : false,
          texSizeOk: maxTex === 0 ? "?" : (oversized ? `OVER (max ${maxTex})` : "OK"),
        }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [debugInfo.maxTexSize]);

  // Play the video with retry and exponential backoff.
  const attemptPlay = async (
    video: HTMLVideoElement,
    maxRetries: number = 3
  ): Promise<void> => {
    video.muted = true;

    let lastError: unknown;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = Math.min(300 * Math.pow(2, attempt - 1), 2000);
          await new Promise(r => setTimeout(r, delay));
          setDebugInfo(d => ({ ...d, state: `retry-${attempt}`, retryCount: attempt }));
        }

        await video.play();

        setIsPlaying(true);
        setFatalError(null);
        setDebugInfo(d => ({ ...d, state: "playing", retryCount: attempt }));

        // Unmute immediately within the same user gesture context.
        // A setTimeout would lose the gesture context on Android Chrome,
        // causing the autoplay policy to pause the video.
        try {
          video.muted = false;
        } catch (_) {}

        return;
      } catch (err) {
        lastError = err;
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`Play attempt ${attempt + 1}/${maxRetries} failed:`, message);

        if (
          message.toLowerCase().includes("not supported") ||
          message.toLowerCase().includes("not allowed") ||
          message.toLowerCase().includes("notallowederror")
        ) {
          break;
        }
      }
    }

    const message = lastError instanceof Error ? (lastError as Error).message : String(lastError);
    if (message.toLowerCase().includes("not supported")) {
      setFatalError("Videokilden st\u00f8ttes ikke p\u00e5 denne enheten (bruk MP4/H.264 + AAC).");
    } else if (message.toLowerCase().includes("not allowed")) {
      setFatalError("Trykk p\u00e5 play-knappen for \u00e5 starte videoen.");
    } else {
      setFatalError(`Kunne ikke spille av video: ${message}`);
    }
    setDebugInfo(d => ({ ...d, state: `play-error: ${message}` }));
  };

  // ─── Create a shared video element ───────────────────────────────────
  const createVideoElement = (container: HTMLElement): HTMLVideoElement => {
    const video = document.createElement("video");
    video.id = videoIdRef.current;
    video.src = videoUrl;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.setAttribute("loop", "true");
    const isCrossOrigin = videoUrl.startsWith("http") && !videoUrl.startsWith(window.location.origin);
    if (isCrossOrigin) {
      video.crossOrigin = "anonymous";
      video.setAttribute("crossorigin", "anonymous");
    }
    video.muted = true;
    video.setAttribute("muted", "");
    video.preload = isIOSDevice() ? "none" : "auto";
    video.playsInline = true;
    (video as any).webkitPlaysInline = true;
    video.autoplay = false;
    video.style.display = "none";
    videoRef.current = video;

    // Debug event listeners
    const updateState = (s: string, playing?: boolean) => () => {
      setDebugInfo((d) => ({ ...d, state: s }));
      if (typeof playing === "boolean") setIsPlaying(playing);
    };
    video.addEventListener("playing", updateState("playing", true));
    video.addEventListener("pause", updateState("paused", false));
    video.addEventListener("waiting", updateState("waiting", false));
    video.addEventListener("stalled", updateState("stalled"));
    video.addEventListener("loadeddata", updateState("loadeddata"));
    video.addEventListener("error", () => {
      const code = video.error?.code ?? 0;
      const noSource = video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE;
      let reason: string;
      if (noSource || code === 4) {
        reason = "Videoen kan ikke spilles av p\u00e5 denne enheten. " +
          "Bruk MP4-format med H.264-video og AAC-lyd.";
      } else {
        reason = `Videofeil (kode ${code}).`;
      }
      setFatalError(reason);
      setDebugInfo((d) => ({ ...d, state: `error: code=${code} net=${video.networkState}` }));
    });

    return video;
  };

  // ─── THREE.JS FALLBACK — for iOS < 15 where A-Frame fails ───────────
  const setupThreeJsPlayer = async (container: HTMLElement, video: HTMLVideoElement) => {
    // Dynamically import Three.js — NOT at the top of the file.
    // This ensures Three.js is only loaded when needed, preventing its modern JS
    // syntax from breaking the main bundle on very old browsers (iOS 13.3).
    const THREE = await import("three");
    const w = container.clientWidth;
    const h = container.clientHeight;

    setDebugInfo(d => ({ ...d, renderer: "three.js", sceneLoaded: true }));
    console.log("Using Three.js fallback renderer");

    // Create WebGL renderer — may fail on iOS if too many contexts are active
    let renderer: any;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    } catch (webglErr) {
      console.error("WebGL context creation failed:", webglErr);
      // Fallback: show video as a regular flat player (not 360, but watchable)
      setDebugInfo(d => ({ ...d, renderer: "flat-video" }));
      video.style.display = "";
      video.style.width = "100%";
      video.style.height = "100%";
      video.style.objectFit = "cover";
      video.removeAttribute("crossorigin");
      video.controls = true;
      container.appendChild(video);
      return () => {};
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    container.appendChild(renderer.domElement);
    container.appendChild(video);

    // Scene + camera
    const scene3 = new THREE.Scene();
    const camera3 = new THREE.PerspectiveCamera(75, w / h, 1, 1100);

    // Inverted sphere (camera inside looking outward)
    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1);

    // Canvas-based texture — draw video frames to 2D canvas, use as texture.
    // This avoids all VideoTexture issues on old iOS.
    const texCanvas = document.createElement("canvas");
    texCanvas.width = 2048;
    texCanvas.height = 1024;
    const texCtx = texCanvas.getContext("2d")!;
    const texture = new THREE.CanvasTexture(texCanvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    const material = new THREE.MeshBasicMaterial({ map: texture });
    const mesh = new THREE.Mesh(geometry, material);

    // Apply iOS rotation compensation
    if (isIOSSafari()) {
      mesh.rotation.set(0, -Math.PI / 2, -Math.PI / 2);
    } else {
      mesh.rotation.set(0, -Math.PI / 2, 0);
    }

    scene3.add(mesh);

    // Store mesh ref for debug
    videosphereRef.current = mesh;
    sceneRef.current = { hasLoaded: true };

    // ── Touch/mouse controls ──
    let dragging = false;
    let prevX = 0, prevY = 0;
    let lon = 0, lat = 0;

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      lon += (prevX - e.clientX) * 0.2;
      lat += (e.clientY - prevY) * 0.2;
      lat = Math.max(-85, Math.min(85, lat));
      prevX = e.clientX;
      prevY = e.clientY;
    };
    const onPointerUp = () => { dragging = false; };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointerleave", onPointerUp);

    // Click/tap on renderer to play
    renderer.domElement.addEventListener("click", () => {
      if (video.paused) void attemptPlay(video);
    });

    // ── Render loop ──
    let rafId: number;
    const animate = () => {
      rafId = requestAnimationFrame(animate);

      // Draw video frame to 2D canvas → CanvasTexture
      if (video.readyState >= 2 && video.videoWidth > 0) {
        texCtx.drawImage(video, 0, 0, texCanvas.width, texCanvas.height);
        texture.needsUpdate = true;
      }

      // Update camera orientation from lon/lat
      const phi = THREE.MathUtils.degToRad(90 - lat);
      const theta = THREE.MathUtils.degToRad(lon);
      const target = new THREE.Vector3(
        500 * Math.sin(phi) * Math.cos(theta),
        500 * Math.cos(phi),
        500 * Math.sin(phi) * Math.sin(theta)
      );
      camera3.lookAt(target);

      renderer.render(scene3, camera3);
    };
    animate();

    // Return cleanup function
    return () => {
      cancelAnimationFrame(rafId);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointerleave", onPointerUp);
      geometry.dispose();
      material.dispose();
      texture.dispose();
      renderer.dispose();
    };
  };

  // ─── A-FRAME RENDERER — for modern browsers ─────────────────────────
  const setupAFramePlayer = (container: HTMLElement, video: HTMLVideoElement) => {
    const AFRAME = (window as any).AFRAME;

    setDebugInfo(d => ({ ...d, renderer: "aframe" }));

    // Register canvas-video-texture component
    if (!AFRAME.components["canvas-video-texture"]) {
      AFRAME.registerComponent("canvas-video-texture", {
        schema: { maxSize: { type: "int", default: 2048 } },
        init: function () {
          this.canvas = document.createElement("canvas");
          this.ctx = this.canvas.getContext("2d");
          this.textureReady = false;
          this._elapsed = 0;
        },
        tick: function (_time: number, timeDelta: number) {
          if (isMobileDevice()) {
            this._elapsed = (this._elapsed || 0) + timeDelta;
            if (this._elapsed < 33) return;
            this._elapsed = 0;
          }

          const srcAttr = this.el.getAttribute("src");
          const videoId = srcAttr ? srcAttr.replace("#", "") : null;
          const vid = videoId ? document.getElementById(videoId) as HTMLVideoElement : null;
          if (!vid || vid.readyState < 2) return;

          const vw = vid.videoWidth;
          const vh = vid.videoHeight;
          if (!vw || !vh) return;

          const renderer = this.el.sceneEl?.renderer;
          if (!renderer) return;
          const gl = renderer.getContext();
          const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);

          const isOldDevice = maxTex <= 4096;
          const oldDeviceCap = isOldDevice ? 1920 : Infinity;

          const isIOS = isIOSDevice();
          const needsCanvas = isIOS || vw > maxTex || vh > maxTex || (isOldDevice && (vw > oldDeviceCap || vh > oldDeviceCap));
          if (!needsCanvas) {
            const mesh = this.el.getObject3D("mesh");
            if (mesh?.material?.map) {
              mesh.material.map.needsUpdate = true;
            }
            return;
          }

          const iosCap = isIOS ? 2048 : Infinity;
          const maxSize = Math.min(this.data.maxSize, maxTex, oldDeviceCap, iosCap);
          const aspect = vw / vh;
          let cw, ch;
          if (vw >= vh) {
            cw = maxSize;
            ch = Math.round(maxSize / aspect);
          } else {
            ch = maxSize;
            cw = Math.round(maxSize * aspect);
          }

          if (this.canvas.width !== cw || this.canvas.height !== ch) {
            this.canvas.width = cw;
            this.canvas.height = ch;
          }

          this.ctx.drawImage(vid, 0, 0, cw, ch);

          const mesh = this.el.getObject3D("mesh");
          if (mesh) {
            const THREE = AFRAME.THREE;
            if (!this.textureReady) {
              const tex = new THREE.CanvasTexture(this.canvas);
              tex.minFilter = THREE.LinearFilter;
              tex.magFilter = THREE.LinearFilter;
              mesh.material.map = tex;
              mesh.material.needsUpdate = true;
              this.textureReady = true;
            } else if (mesh.material.map) {
              mesh.material.map.needsUpdate = true;
            }
          }
        },
      });
    }

    const scene = document.createElement("a-scene");
    scene.setAttribute("embedded", "");
    scene.setAttribute("vr-mode-ui", "enabled: true");
    scene.setAttribute("loading-screen", "enabled: false");
    const mobile = isMobileDevice();
    scene.setAttribute("renderer", `colorManagement: false; antialias: ${mobile ? "false" : "true"}`);
    scene.style.position = "absolute";
    scene.style.top = "0";
    scene.style.left = "0";
    scene.style.width = "100%";
    scene.style.height = "100%";
    scene.style.zIndex = "1";
    sceneRef.current = scene;

    // Video inside scene (not in a-assets)
    scene.appendChild(video);

    const videosphere = document.createElement("a-videosphere");
    videosphere.setAttribute("src", `#${videoIdRef.current}`);
    const iosDevice = isIOSSafari();
    videosphere.setAttribute("rotation", iosDevice ? "0 -90 -90" : "0 -90 0");
    videosphere.setAttribute("canvas-video-texture", "maxSize: 4096");
    scene.appendChild(videosphere);
    videosphereRef.current = videosphere;

    const camera = document.createElement("a-camera");
    camera.setAttribute("look-controls", "magicWindowTrackingEnabled: false; reverseMouseDrag: true");
    camera.setAttribute("wasd-controls", "enabled: false");
    scene.appendChild(camera);

    scene.addEventListener("loaded", () => {
      setDebugInfo((d) => ({ ...d, sceneLoaded: true }));
    });

    container.appendChild(scene);

    // Scene interaction handlers
    let lastInteractionAt = 0;
    const handleSceneInteraction = () => {
      const now = Date.now();
      if (now - lastInteractionAt < 250) return;
      lastInteractionAt = now;
      const vid = videoRef.current;
      if (vid && vid.paused) void attemptPlay(vid);
    };
    scene.addEventListener("click", handleSceneInteraction);
    scene.addEventListener("touchend", handleSceneInteraction);

    // Return cleanup function
    return () => {
      scene.removeEventListener("click", handleSceneInteraction);
      scene.removeEventListener("touchend", handleSceneInteraction);
      if (scene.parentNode) {
        const sceneEl = scene as any;
        if (sceneEl.destroy) sceneEl.destroy();
        scene.remove();
      }
    };
  };

  // ─── MAIN SETUP EFFECT ──────────────────────────────────────────────
  useEffect(() => {
    if (!aframeLoaded || !containerRef.current) return;

    setFatalError(null);
    setIsPlaying(false);

    const container = containerRef.current;
    container.innerHTML = "";

    let cleanup: (() => void) | undefined;
    let cancelled = false;

    const doCleanup = () => {
      try { cleanup?.(); } catch (_) {}

      if (videoRef.current) {
        try {
          videoRef.current.pause();
          videoRef.current.removeAttribute("src");
          videoRef.current.load();
        } catch (_) {}
      }
      videoRef.current = null;
      videosphereRef.current = null;
      sceneRef.current = null;

      try {
        const orphanedVideo = document.getElementById(videoIdRef.current);
        if (orphanedVideo?.parentNode) {
          orphanedVideo.remove();
        }
      } catch (_) {}
    };

    try {
      const video = createVideoElement(container);

      if (useThreeJsFallback) {
        container.appendChild(video);
        // setupThreeJsPlayer is async (dynamic import of Three.js).
        // We handle the promise and check if the effect was already cleaned up.
        setupThreeJsPlayer(container, video)
          .then((cleanupFn) => {
            if (cancelled) {
              // Effect already unmounted — clean up immediately
              try { cleanupFn?.(); } catch (_) {}
            } else {
              cleanup = cleanupFn;
            }
          })
          .catch((err) => {
            if (!cancelled) {
              console.error("Three.js setup failed:", err);
              setFatalError("360-spilleren kunne ikke starte. " + (err instanceof Error ? err.message : String(err)));
            }
          });
      } else {
        cleanup = setupAFramePlayer(container, video);
      }
    } catch (err) {
      console.error("360 player setup failed:", err);
      setFatalError("360-spilleren kunne ikke starte. " + (err instanceof Error ? err.message : String(err)));
    }

    return () => {
      cancelled = true;
      doCleanup();
    };
  }, [aframeLoaded, videoUrl]);

  const handlePlayClick = () => {
    const video = videoRef.current;
    if (!video) return;
    void attemptPlay(video);
  };

  const [showDebug, setShowDebug] = useState(false);

  return (
    <div>
      {/* Collapsible debug info */}
      <details
        open={showDebug}
        onToggle={(e) => setShowDebug((e.target as HTMLDetailsElement).open)}
        className="mb-2"
      >
        <summary className="cursor-pointer text-xs font-mono text-emerald-500 select-none flex items-center gap-1 hover:text-emerald-400 transition-colors">
          <span className="transition-transform inline-block" style={{ transform: showDebug ? "rotate(90deg)" : "rotate(0deg)" }}>▶</span>
          Debug info
        </summary>
        <div className="mt-1 p-2 rounded bg-black/80 text-emerald-400 font-mono text-[10px] leading-relaxed overflow-auto max-h-40">
          <div>State: {debugInfo.state}</div>
          <div>Time: {debugInfo.time.toFixed(1)}s</div>
          <div>Dims: {debugInfo.dimensions}</div>
          <div>Muted: {String(debugInfo.muted)}</div>
          <div>Ready: {debugInfo.readyState} | Net: {debugInfo.networkState}</div>
          <div>Texture: {debugInfo.textureStatus}</div>
          <div>Scene: {String(debugInfo.sceneLoaded)}</div>
          <div>TexSize: {debugInfo.texSizeOk} (max {debugInfo.maxTexSize})</div>
          <div>iOS: {String(debugInfo.isIOS)} | Retries: {debugInfo.retryCount}</div>
          <div>Renderer: {debugInfo.renderer}</div>
          <div className="break-all">Src: {debugInfo.videoSrc}</div>
          <div className="break-all">UA: {debugInfo.browser}</div>
        </div>
      </details>
      {fatalError ? (
        <div className="w-full h-[400px] rounded-lg border border-border bg-muted flex flex-col items-center justify-center gap-3 p-4 text-center">
          <p className="text-sm text-foreground">{fatalError}</p>
          <a
            href={videoUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-primary underline"
          >
            {"\u00C5"}pne video i ny fane
          </a>
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          <div
            ref={containerRef}
            className="w-full rounded-lg overflow-hidden"
            style={{ height: "400px", position: "relative" }}
          />
          {!isPlaying && (
            <button
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                handlePlayClick();
              }}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                zIndex: 10,
                background: "rgba(0,0,0,0.7)",
                border: "3px solid white",
                borderRadius: "50%",
                width: "80px",
                height: "80px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="white">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
