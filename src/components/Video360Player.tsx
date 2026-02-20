import { useRef, useEffect } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import "videojs-vr/dist/videojs-vr.css";
import "videojs-vr";

interface Video360PlayerProps {
  videoUrl: string;
}

export function Video360Player({ videoUrl }: Video360PlayerProps) {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<ReturnType<typeof videojs> | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    const videoElement = document.createElement("video-js");
    videoElement.classList.add("vjs-big-play-centered", "vjs-fluid");
    videoRef.current.appendChild(videoElement);

    const player = videojs(videoElement, {
      controls: true,
      autoplay: false,
      preload: "auto",
      loop: true,
      muted: true,
      sources: [{ src: videoUrl, type: "video/mp4" }],
    });

    // Initialize 360/VR plugin after player is ready
    player.ready(() => {
      (player as any).vr({ projection: "equirectangular" });
    });
    playerRef.current = player;

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [videoUrl]);

  return (
    <div className="w-full rounded-lg overflow-hidden">
      <div ref={videoRef} />
    </div>
  );
}
