import { useRef, useEffect, useState } from "react";

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
}

export function Video360Player({ videoUrl }: Video360PlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videosphereRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const videoIdRef = useRef(`vid360-${Math.random().toString(36).slice(2, 9)}`);
  const [aframeLoaded, setAframeLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
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
  });

  useEffect(() => {
    setDebugInfo((d) => ({ ...d, browser: navigator.userAgent.slice(0, 80) }));
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

  useEffect(() => {
    if (!aframeLoaded || !containerRef.current) return;

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
        },
        tick: function () {
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
            console.log(`Canvas texture: scaling ${vw}x${vh} → ${cw}x${ch} (maxTex: ${maxTex})`);
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
    scene.setAttribute("renderer", "colorManagement: false; antialias: true");
    sceneRef.current = scene;

    const assets = document.createElement("a-assets");
    const video = document.createElement("video");
    video.id = videoIdRef.current;
    video.crossOrigin = "anonymous";
    video.src = videoUrl;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.setAttribute("loop", "true");
    video.setAttribute("crossorigin", "anonymous");
    video.muted = true;
    video.setAttribute("muted", "");
    video.preload = "auto";
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
      setDebugInfo((d) => ({ ...d, state: `error: ${video.error?.code}` }));
      console.error("360 video error:", video.error);
    });

    assets.appendChild(video);
    scene.appendChild(assets);

    const videosphere = document.createElement("a-videosphere");
    videosphere.setAttribute("src", `#${videoIdRef.current}`);
    videosphere.setAttribute("rotation", "0 -90 0");
    // Use canvas-video-texture instead of force-texture-update for Samsung compatibility
    videosphere.setAttribute("canvas-video-texture", "maxSize: 4096");
    scene.appendChild(videosphere);
    videosphereRef.current = videosphere;

    const camera = document.createElement("a-camera");
    camera.setAttribute("look-controls", "reverseMouseDrag: true");
    camera.setAttribute("wasd-controls", "enabled: false");
    scene.appendChild(camera);

    container.appendChild(scene);

    scene.addEventListener("loaded", () => {
      setDebugInfo((d) => ({ ...d, sceneLoaded: true }));
    });

    let lastInteractionAt = 0;
    const handleSceneInteraction = async () => {
      const now = Date.now();
      if (now - lastInteractionAt < 250) return;
      lastInteractionAt = now;

      if (video.paused) {
        try {
          video.muted = true;
          await video.play();
          setIsPlaying(true);
          setDebugInfo((d) => ({ ...d, state: "playing muted (tap again for sound)" }));
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          setDebugInfo((d) => ({ ...d, state: `play-error: ${message}` }));
        }
        return;
      }

      if (video.muted) {
        video.muted = false;
        setDebugInfo((d) => ({ ...d, state: "playing with sound" }));
      }
    };

    scene.addEventListener("click", handleSceneInteraction);
    scene.addEventListener("touchend", handleSceneInteraction);

    return () => {
      scene.removeEventListener("click", handleSceneInteraction);
      scene.removeEventListener("touchend", handleSceneInteraction);
      videoRef.current = null;
      videosphereRef.current = null;
      sceneRef.current = null;
      if (scene.parentNode) {
        const sceneEl = scene as any;
        if (sceneEl.destroy) sceneEl.destroy();
        scene.remove();
      }
    };
  }, [aframeLoaded, videoUrl]);

  const handlePlayClick = async () => {
    const video = videoRef.current;
    if (!video) return;

    const isMobileDevice = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

    try {
      if (isMobileDevice) {
        video.muted = true;
        await video.play();
        setIsPlaying(true);
        setDebugInfo((d) => ({ ...d, state: "playing muted (tap again for sound)" }));
        return;
      }

      video.muted = false;
      await video.play();
      setIsPlaying(true);
      setDebugInfo((d) => ({ ...d, state: "playing (user gesture)" }));
    } catch (err) {
      try {
        video.muted = true;
        await video.play();
        setIsPlaying(true);
        setDebugInfo((d) => ({ ...d, state: "playing muted (tap again for sound)" }));
      } catch (fallbackErr) {
        const message = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
        console.error("Play failed:", fallbackErr);
        setDebugInfo((d) => ({ ...d, state: `play-error: ${message}` }));
      }
    }
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
        <div style={{ fontSize: "10px", opacity: 0.7 }}><b>UA:</b> {debugInfo.browser}</div>
      </div>
      <div style={{ position: "relative" }}>
        <div
          ref={containerRef}
          className="w-full rounded-lg overflow-hidden"
          style={{ height: "400px" }}
        />
        {!isPlaying && (
          <button
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void handlePlayClick();
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
    </div>
  );
}
