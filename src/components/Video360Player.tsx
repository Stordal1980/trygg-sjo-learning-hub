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

    const container = containerRef.current;

    // Clear previous scene
    container.innerHTML = "";

    // Build a-scene with videosphere
    const scene = document.createElement("a-scene");
    scene.setAttribute("embedded", "");
    scene.setAttribute("vr-mode-ui", "enabled: true");
    scene.setAttribute("loading-screen", "enabled: false");

    const assets = document.createElement("a-assets");
    const video = document.createElement("video");
    video.id = "vid360";
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
      console.log("360 video loaded successfully");
    });

    assets.appendChild(video);
    scene.appendChild(assets);

    const videosphere = document.createElement("a-videosphere");
    videosphere.setAttribute("src", "#vid360");
    videosphere.setAttribute("rotation", "0 -90 0");
    scene.appendChild(videosphere);

    // Camera with look controls for drag/touch interaction
    const camera = document.createElement("a-camera");
    camera.setAttribute("look-controls", "reverseMouseDrag: true");
    camera.setAttribute("wasd-controls", "enabled: false");
    scene.appendChild(camera);

    container.appendChild(scene);

    // Start video when scene is loaded (muted autoplay is allowed)
    scene.addEventListener("loaded", () => {
      video.play().catch((e) => console.warn("Autoplay failed:", e));
    });

    // Click/tap to unmute only
    const handleInteraction = () => {
      video.muted = false;
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
