import { useRef, useEffect, useState } from "react";

const isIOSSafari = (): boolean => {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua);
  return isIOS && isSafari;
};

const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
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
  });

  useEffect(() => {
    setDebugInfo((d) => ({
      ...d,
      browser: navigator.userAgent.slice(0, 80),
      isIOS: isIOSSafari(),
      videoSrc: videoUrl.slice(0, 60),
    }));
    // Check GPU max texture size
    try {
      const c = document.createElement("canvas");
      const gl = c.getContext("webgl") || c.getContext("experimental-webgl");
      if (gl) {
        const max = (gl as WebGLRenderingContext).getParameter((gl as WebGLRenderingContext).MAX_TEXTURE_SIZE);
        setDebugInfo((d) => ({ ...d, maxTexSize: max }));
      }
    } catch (e) {}
  }, []);

  // Load A-Frame dynamically
  useEffect(() => {
    if ((window as any).AFRAME) {
      setAframeLoaded(true);
      return;
    }
    import("aframe").then(() => setAframeLoaded(true));
  }, []);

  // Debug interval
  useEffect(() => {
    const interval = setInterval(() => {
      const video = videoRef.current;
      const sphere = videosphereRef.current;
      const scene = sceneRef.current;

      if (video) {
        const mesh = sphere?.getObject3D?.("mesh");
        const hasMap = !!(mesh?.material?.map);
        const maxTex = debugInfo.maxTexSize;
        const oversized = video.videoWidth > maxTex || video.videoHeight > maxTex;

        setDebugInfo((d) => ({
          ...d,
          time: video.currentTime,
          dimensions: `${video.videoWidth}x${video.videoHeight}`,
          muted: video.muted,
          readyState: video.readyState,
          networkState: video.networkState,
          textureStatus: mesh ? (hasMap ? "OK" : "no map") : "no mesh",
          sceneLoaded: !!(scene as any)?.hasLoaded,
          texSizeOk: maxTex === 0 ? "?" : (oversized ? `OVER (max ${maxTex})` : "OK"),
        }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [debugInfo.maxTexSize]);

  // Play the video with retry and exponential backoff.
  // CRITICAL: call this synchronously from user gesture handler — no awaits before video.play().
  // On iOS, play() itself triggers loading + playback. Do NOT call load() first.
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

        // Success
        setIsPlaying(true);
        setFatalError(null);
        setDebugInfo(d => ({ ...d, state: "playing", retryCount: attempt }));

        // Auto-unmute after 500ms of stable playback
        setTimeout(() => {
          try {
            if (videoRef.current && !videoRef.current.paused) {
              videoRef.current.muted = false;
            }
          } catch (_) {}
        }, 500);

        return;
      } catch (err) {
        lastError = err;
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`Play attempt ${attempt + 1}/${maxRetries} failed:`, message);

        // NotAllowedError or not-supported won't be fixed by retrying
        if (
          message.toLowerCase().includes("not supported") ||
          message.toLowerCase().includes("not allowed") ||
          message.toLowerCase().includes("notallowederror")
        ) {
          break;
        }
      }
    }

    // All retries exhausted
    const message = lastError instanceof Error ? (lastError as Error).message : String(lastError);
    if (message.toLowerCase().includes("not supported")) {
      setFatalError("Videokilden st\u00f8ttes ikke p\u00e5 iPhone Safari (bruk MP4/H.264 + AAC).");
    } else if (message.toLowerCase().includes("not allowed")) {
      setFatalError("Trykk p\u00e5 play-knappen for \u00e5 starte videoen (iOS krever brukerinteraksjon).");
    } else {
      setFatalError(`Kunne ikke spille av video: ${message}`);
    }
    setDebugInfo(d => ({ ...d, state: `play-error: ${message}` }));
  };

  useEffect(() => {
    if (!aframeLoaded || !containerRef.current) return;

    setFatalError(null);
    setIsPlaying(false);

    const AFRAME = (window as any).AFRAME;

    // Register component that draws video to a canvas (downscaled) and uses that as texture
    // This fixes Samsung Internet where video textures larger than MAX_TEXTURE_SIZE show black
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
          // Throttle on mobile: ~30fps cap to reduce GPU memory pressure
          if (isMobileDevice()) {
            this._elapsed = (this._elapsed || 0) + timeDelta;
            if (this._elapsed < 33) return;
            this._elapsed = 0;
          }

          const srcAttr = this.el.getAttribute("src");
          const videoId = srcAttr ? srcAttr.replace("#", "") : null;
          const video = videoId ? document.getElementById(videoId) as HTMLVideoElement : null;
          if (!video || video.readyState < 2) return;

          const vw = video.videoWidth;
          const vh = video.videoHeight;
          if (!vw || !vh) return;

          // Check if we need the canvas workaround
          const renderer = this.el.sceneEl?.renderer;
          if (!renderer) return;
          const gl = renderer.getContext();
          const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE);

          // Old device detection: cap at 1920 for GPUs with MAX_TEXTURE_SIZE <= 4096
          const isOldDevice = maxTex <= 4096;
          const oldDeviceCap = isOldDevice ? 1920 : Infinity;

          // Only use canvas workaround if video exceeds limits
          const needsDownscale = vw > maxTex || vh > maxTex || (isOldDevice && (vw > oldDeviceCap || vh > oldDeviceCap));
          if (!needsDownscale) {
            // Just do needsUpdate for normal-sized videos on modern devices
            const mesh = this.el.getObject3D("mesh");
            if (mesh?.material?.map) {
              mesh.material.map.needsUpdate = true;
            }
            return;
          }

          // Scale down to fit within the most restrictive limit
          const maxSize = Math.min(this.data.maxSize, maxTex, oldDeviceCap);
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
            console.log(`Canvas texture: scaling ${vw}x${vh} \u2192 ${cw}x${ch} (maxTex: ${maxTex})`);
          }

          // Draw video frame to canvas
          this.ctx.drawImage(video, 0, 0, cw, ch);

          // Apply canvas as texture
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

    const container = containerRef.current;
    container.innerHTML = "";

    const scene = document.createElement("a-scene");
    scene.setAttribute("embedded", "");
    scene.setAttribute("vr-mode-ui", "enabled: true");
    scene.setAttribute("loading-screen", "enabled: false");
    // Disable antialias on mobile — it's expensive and can cause WebGL context creation
    // to fail silently on older iPhones with limited GPU memory.
    const mobile = isMobileDevice();
    scene.setAttribute("renderer", `colorManagement: false; antialias: ${mobile ? "false" : "true"}`);
    // Constrain scene within container on iOS Safari
    scene.style.position = "absolute";
    scene.style.top = "0";
    scene.style.left = "0";
    scene.style.width = "100%";
    scene.style.height = "100%";
    scene.style.zIndex = "1";
    sceneRef.current = scene;

    const video = document.createElement("video");
    video.id = videoIdRef.current;
    video.src = videoUrl;
    video.setAttribute("src", videoUrl);
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.setAttribute("loop", "true");
    // Only set crossOrigin for cross-origin URLs (not for same-origin or data: URLs)
    const isCrossOrigin = videoUrl.startsWith("http") && !videoUrl.startsWith(window.location.origin);
    if (isCrossOrigin) {
      video.crossOrigin = "anonymous";
      video.setAttribute("crossorigin", "anonymous");
    }
    video.muted = true;
    video.setAttribute("muted", "");
    video.preload = isIOSSafari() ? "none" : "auto";
    video.playsInline = true;
    (video as any).webkitPlaysInline = true;
    video.autoplay = false;
    videoRef.current = video;

    // State event listeners for debug
    const updateState = (s: string, playing?: boolean) => () => {
      setDebugInfo((d) => ({ ...d, state: s }));
      if (typeof playing === "boolean") setIsPlaying(playing);
    };
    video.addEventListener("playing", updateState("playing", true));
    video.addEventListener("pause", updateState("paused", false));
    video.addEventListener("waiting", updateState("waiting", false));
    video.addEventListener("stalled", updateState("stalled", false));
    video.addEventListener("loadeddata", updateState("loadeddata"));
    video.addEventListener("error", () => {
      const code = video.error?.code ?? 0;
      const noSource = video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE;
      let reason: string;
      if (noSource || code === 4) {
        reason = "Videoen kan ikke spilles av p\u00e5 denne enheten. " +
          "Videofilen bruker sannsynligvis et videoformat (codec) som ikke st\u00f8ttes. " +
          "Be admin laste opp videoen p\u00e5 nytt i MP4-format med H.264-video og AAC-lyd.";
      } else {
        reason = `Videofeil (kode ${code}).`;
      }

      setFatalError(reason);
      setDebugInfo((d) => ({ ...d, state: `error: code=${code} net=${video.networkState}` }));
      console.error("360 video error:", video.error, "networkState:", video.networkState, "src:", videoUrl);
    });

    // Place video inside <a-scene> as a direct child (NOT inside <a-assets>).
    // - Putting it inside a-assets blocks scene init until the video is "ready" (30s+ timeout)
    // - Putting it outside the scene entirely breaks iOS because A-Frame sometimes uses
    //   sceneEl.querySelector() to resolve src="#id" (not document.querySelector)
    // - As a direct child of a-scene (outside a-assets), A-Frame ignores it during asset loading
    //   but can still find it via querySelector for the src="#id" reference.
    // NO <a-assets> element at all — even empty, it can trigger asset loading logic on iOS.
    video.style.display = "none";
    scene.appendChild(video);

    const videosphere = document.createElement("a-videosphere");
    videosphere.setAttribute("src", `#${videoIdRef.current}`);
    // iOS Safari applies the video's embedded rotation metadata to WebGL textures,
    // while Chrome ignores it. This causes a 90° offset on iOS.
    // Compensate with Z-axis rotation on iOS.
    const iosDevice = isIOSSafari();
    videosphere.setAttribute("rotation", iosDevice ? "0 -90 -90" : "0 -90 0");
    // Use canvas-video-texture instead of force-texture-update for Samsung compatibility
    videosphere.setAttribute("canvas-video-texture", "maxSize: 4096");
    scene.appendChild(videosphere);
    videosphereRef.current = videosphere;

    const camera = document.createElement("a-camera");
    camera.setAttribute("look-controls", "reverseMouseDrag: true");
    camera.setAttribute("wasd-controls", "enabled: false");
    scene.appendChild(camera);

    // Attach scene "loaded" listener BEFORE appending to DOM to avoid race condition
    // (on some browsers, the event fires synchronously during DOM insertion)
    scene.addEventListener("loaded", () => {
      setDebugInfo((d) => ({ ...d, sceneLoaded: true }));
    });

    container.appendChild(scene);

    // Fallback: on iOS 14.x, A-Frame's scene init stalls — hasLoaded stays false,
    // which means the render loop never starts. Even if we create a perfect mesh+texture,
    // nothing gets drawn because A-Frame's renderer.render() is never called.
    //
    // Fix: after 3 seconds, if the scene hasn't loaded:
    // 1. Ensure the videosphere has a working mesh+texture
    // 2. Force-start A-Frame by setting hasLoaded=true and calling play()
    //    This starts the render loop AND component ticking (look-controls, etc.)
    // 3. If play() fails, fall back to a manual requestAnimationFrame render loop
    const sceneLoadTimeout = setTimeout(() => {
      const sceneEl = scene as any;

      // Step 1: Ensure videosphere has a working texture
      const sphere = videosphereRef.current;
      const vid = videoRef.current;
      if (sphere && vid) {
        const mesh = sphere.getObject3D?.("mesh");
        if (mesh && !mesh.material?.map) {
          console.warn("Videosphere has no texture map — applying video texture manually");
          try {
            const THREE = (window as any).AFRAME.THREE;
            const tex = new THREE.VideoTexture(vid);
            tex.minFilter = THREE.LinearFilter;
            tex.magFilter = THREE.LinearFilter;
            tex.format = THREE.RGBAFormat;
            mesh.material.map = tex;
            mesh.material.needsUpdate = true;
            setDebugInfo(d => ({ ...d, textureStatus: "manual-fix" }));
          } catch (e) {
            console.error("Manual texture setup failed:", e);
          }
        } else if (!mesh) {
          console.warn("No mesh on videosphere — creating geometry manually");
          try {
            const THREE = (window as any).AFRAME.THREE;
            const geometry = new THREE.SphereGeometry(500, 60, 40);
            geometry.scale(-1, 1, 1);
            const tex = new THREE.VideoTexture(vid);
            tex.minFilter = THREE.LinearFilter;
            tex.magFilter = THREE.LinearFilter;
            const material = new THREE.MeshBasicMaterial({ map: tex });
            const sphereMesh = new THREE.Mesh(geometry, material);
            const iosRot = isIOSSafari();
            sphereMesh.rotation.set(0, -Math.PI / 2, iosRot ? -Math.PI / 2 : 0);
            sphere.setObject3D("mesh", sphereMesh);
            setDebugInfo(d => ({ ...d, textureStatus: "manual-mesh" }));
            console.log("Manual mesh created successfully");
          } catch (e) {
            console.error("Manual mesh creation failed:", e);
          }
        }
      }

      // Step 2: Force-start the render loop if scene didn't load
      if (!sceneEl.hasLoaded) {
        console.warn("A-Frame scene not loaded after 3s — force-starting render loop");
        setDebugInfo(d => ({ ...d, state: d.state + " (force-start)" }));

        try {
          // Tell A-Frame the scene is loaded so play() can start the render loop
          sceneEl.hasLoaded = true;
          sceneEl.emit("loaded");

          // play() starts the render loop AND component ticking (look-controls, canvas-video-texture)
          if (typeof sceneEl.play === "function") {
            sceneEl.play();
            console.log("A-Frame scene force-started successfully");
          }
        } catch (e) {
          console.error("Force-start via play() failed:", e);

          // Last resort: manual render loop using A-Frame's renderer
          if (sceneEl.renderer && sceneEl.object3D && sceneEl.camera) {
            console.warn("Starting manual render loop");
            let manualRafId: number;
            const manualRender = () => {
              if (!sceneRef.current) return;
              manualRafId = requestAnimationFrame(manualRender);
              try {
                sceneEl.renderer.render(sceneEl.object3D, sceneEl.camera);
              } catch (_) {
                cancelAnimationFrame(manualRafId);
              }
            };
            manualRender();
          }
        }
      }
    }, 3000);

    let lastInteractionAt = 0;
    const handleSceneInteraction = () => {
      const now = Date.now();
      if (now - lastInteractionAt < 250) return;
      lastInteractionAt = now;

      const vid = videoRef.current;
      if (!vid) return;

      if (vid.paused) {
        void attemptPlay(vid);
      }
    };

    scene.addEventListener("click", handleSceneInteraction);
    scene.addEventListener("touchend", handleSceneInteraction);

    return () => {
      clearTimeout(sceneLoadTimeout);
      scene.removeEventListener("click", handleSceneInteraction);
      scene.removeEventListener("touchend", handleSceneInteraction);

      // Pause and clean up video
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute("src");
        videoRef.current.load();
      }

      videoRef.current = null;
      videosphereRef.current = null;
      sceneRef.current = null;
      if (scene.parentNode) {
        const sceneEl = scene as any;
        if (sceneEl.destroy) sceneEl.destroy();
        scene.remove();
      }
      // Clean up any orphaned video element
      const orphanedVideo = document.getElementById(videoIdRef.current);
      if (orphanedVideo?.parentNode) {
        orphanedVideo.remove();
      }
    };
  }, [aframeLoaded, videoUrl]);

  const handlePlayClick = () => {
    const video = videoRef.current;
    if (!video) return;

    // CRITICAL: Call attemptPlay synchronously from the click handler.
    // Do NOT await anything before video.play() — iOS requires it in the gesture chain.
    void attemptPlay(video);
  };

  return (
    <div>
      {/* Debug info box above video */}
      <div
        style={{
          background: "#111",
          color: "#0f0",
          fontFamily: "monospace",
          fontSize: "12px",
          padding: "10px 12px",
          borderRadius: "6px",
          lineHeight: 1.6,
          marginBottom: "8px",
        }}
      >
        <div><b>State:</b> {debugInfo.state} | <b>Time:</b> {debugInfo.time.toFixed(1)}s | <b>Dim:</b> {debugInfo.dimensions}</div>
        <div><b>Muted:</b> {debugInfo.muted ? "yes" : "no"} | <b>Ready:</b> {debugInfo.readyState} | <b>Net:</b> {debugInfo.networkState}</div>
        <div><b>Texture:</b> {debugInfo.textureStatus} | <b>Scene:</b> {debugInfo.sceneLoaded ? "loaded" : "not loaded"}</div>
        <div><b>MaxTexSize:</b> {debugInfo.maxTexSize} | <b>TexFit:</b> {debugInfo.texSizeOk}</div>
        <div><b>iOS:</b> {debugInfo.isIOS ? "yes" : "no"} | <b>Retries:</b> {debugInfo.retryCount}</div>
        <div style={{ fontSize: "10px", opacity: 0.7 }}><b>Src:</b> {debugInfo.videoSrc}...</div>
        <div style={{ fontSize: "10px", opacity: 0.7 }}><b>UA:</b> {debugInfo.browser}</div>
      </div>
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
