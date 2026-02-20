import { useRef, useEffect, useState } from "react";

interface Video360PlayerProps {
  videoUrl: string;
}

export function Video360Player({ videoUrl }: Video360PlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [aframeLoaded, setAframeLoaded] = useState(false);

  // Load A-Frame dynamically (it registers global custom elements)
  useEffect(() => {
    if ((window as any).AFRAME) {
      setAframeLoaded(true);
      return;
    }

    import("aframe").then(() => {
      setAframeLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!aframeLoaded || !containerRef.current) return;

    const AFRAME = (window as any).AFRAME;

    // Register a component that forces video texture update every frame
    // This fixes Samsung Internet where textures don't auto-update
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

    // Clear previous scene
    container.innerHTML = "";

    // Build a-scene with videosphere
    const scene = document.createElement("a-scene");
    scene.setAttribute("embedded", "");
    scene.setAttribute("vr-mode-ui", "enabled: true");
    scene.setAttribute("loading-screen", "enabled: false");
    scene.setAttribute("renderer", "colorManagement: false; antialias: true");

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

    video.addEventListener("loadeddata", () => {
      console.log("360 video loaded successfully, dimensions:", video.videoWidth, "x", video.videoHeight);
    });

    video.addEventListener("error", (e) => {
      console.error("360 video error:", video.error);
    });

    assets.appendChild(video);
    scene.appendChild(assets);

    const videosphere = document.createElement("a-videosphere");
    videosphere.setAttribute("src", "#vid360");
    videosphere.setAttribute("rotation", "0 -90 0");
    // Force texture update each frame for Samsung Internet compatibility
    videosphere.setAttribute("force-texture-update", "");
    scene.appendChild(videosphere);

    // Camera with look controls for drag/touch interaction
    const camera = document.createElement("a-camera");
    camera.setAttribute("look-controls", "reverseMouseDrag: true");
    camera.setAttribute("wasd-controls", "enabled: false");
    scene.appendChild(camera);

    container.appendChild(scene);

    // Start video when scene is loaded (muted autoplay is allowed)
    scene.addEventListener("loaded", () => {
      // Small delay to ensure WebGL context is fully ready
      setTimeout(() => {
        video.play().catch((e) => console.warn("Autoplay failed:", e));
      }, 100);
    });

    // Click/tap to unmute only
    const handleInteraction = () => {
      video.muted = false;
      // Also try to play again in case autoplay was blocked
      video.play().catch(() => {});
    };
    scene.addEventListener("click", handleInteraction, { once: true });

    return () => {
      scene.removeEventListener("click", handleInteraction);
      // Dispose a-scene
      if (scene.parentNode) {
        const sceneEl = scene as any;
        if (sceneEl.destroy) sceneEl.destroy();
        scene.remove();
      }
    };
  }, [aframeLoaded, videoUrl]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-lg overflow-hidden"
      style={{ height: "400px", position: "relative" }}
    />
  );
}
