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
}

export function Video360Player({ videoUrl }: Video360PlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videosphereRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const [aframeLoaded, setAframeLoaded] = useState(false);
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
  });

  useEffect(() => {
    setDebugInfo((d) => ({ ...d, browser: navigator.userAgent.slice(0, 80) }));
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

        setDebugInfo((d) => ({
          ...d,
          time: video.currentTime,
          dimensions: `${video.videoWidth}x${video.videoHeight}`,
          muted: video.muted,
          readyState: video.readyState,
          networkState: video.networkState,
          textureStatus: mesh ? (hasMap ? "OK" : "no map") : "no mesh",
          sceneLoaded: !!(scene as any)?.hasLoaded,
        }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!aframeLoaded || !containerRef.current) return;

    const AFRAME = (window as any).AFRAME;

    if (!AFRAME.components["force-texture-update"]) {
      AFRAME.registerComponent("force-texture-update", {
        tick: function () {
          const mesh = this.el.getObject3D("mesh");
          if (mesh && mesh.material && mesh.material.map) {
            mesh.material.map.needsUpdate = true;
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
    video.id = "vid360";
    video.crossOrigin = "anonymous";
    video.src = videoUrl;
    video.setAttribute("autoplay", "");
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.setAttribute("loop", "true");
    video.setAttribute("crossorigin", "anonymous");
    video.muted = true;
    video.preload = "auto";
    videoRef.current = video;

    // State event listeners for debug
    const updateState = (s: string) => () => setDebugInfo((d) => ({ ...d, state: s }));
    video.addEventListener("playing", updateState("playing"));
    video.addEventListener("pause", updateState("paused"));
    video.addEventListener("waiting", updateState("waiting"));
    video.addEventListener("stalled", updateState("stalled"));
    video.addEventListener("loadeddata", updateState("loadeddata"));
    video.addEventListener("error", (e) => {
      setDebugInfo((d) => ({ ...d, state: `error: ${video.error?.code}` }));
      console.error("360 video error:", video.error);
    });

    assets.appendChild(video);
    scene.appendChild(assets);

    const videosphere = document.createElement("a-videosphere");
    videosphere.setAttribute("src", "#vid360");
    videosphere.setAttribute("rotation", "0 -90 0");
    videosphere.setAttribute("force-texture-update", "");
    scene.appendChild(videosphere);
    videosphereRef.current = videosphere;

    const camera = document.createElement("a-camera");
    camera.setAttribute("look-controls", "reverseMouseDrag: true");
    camera.setAttribute("wasd-controls", "enabled: false");
    scene.appendChild(camera);

    container.appendChild(scene);

    scene.addEventListener("loaded", () => {
      setDebugInfo((d) => ({ ...d, sceneLoaded: true }));
      setTimeout(() => {
        video.play().catch((e) => console.warn("Autoplay failed:", e));
      }, 100);
    });

    const handleInteraction = () => {
      video.muted = false;
      video.play().catch(() => {});
    };
    scene.addEventListener("click", handleInteraction, { once: true });

    return () => {
      videoRef.current = null;
      videosphereRef.current = null;
      sceneRef.current = null;
      scene.removeEventListener("click", handleInteraction);
      if (scene.parentNode) {
        const sceneEl = scene as any;
        if (sceneEl.destroy) sceneEl.destroy();
        scene.remove();
      }
    };
  }, [aframeLoaded, videoUrl]);

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
        <div style={{ fontSize: "10px", opacity: 0.7 }}><b>UA:</b> {debugInfo.browser}</div>
      </div>
      <div
        ref={containerRef}
        className="w-full rounded-lg overflow-hidden"
        style={{ height: "400px" }}
      />
    </div>
  );
}
