import { useRef, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize } from "lucide-react";
import { cn } from "@/lib/utils";

interface Video360SphereProps {
  videoUrl: string;
  isPlaying: boolean;
  isMuted: boolean;
}

function Video360Sphere({ videoUrl, isPlaying, isMuted }: Video360SphereProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const videoRef = useRef<HTMLVideoElement>();
  const textureRef = useRef<THREE.VideoTexture>();

  useEffect(() => {
    const video = document.createElement("video");
    video.src = videoUrl;
    video.crossOrigin = "anonymous";
    video.loop = true;
    video.muted = isMuted;
    video.playsInline = true;
    videoRef.current = video;

    const texture = new THREE.VideoTexture(video);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBAFormat;
    textureRef.current = texture;

    if (meshRef.current) {
      (meshRef.current.material as THREE.MeshBasicMaterial).map = texture;
    }

    return () => {
      video.pause();
      video.src = "";
      texture.dispose();
    };
  }, [videoUrl]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(console.error);
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  return (
    <mesh ref={meshRef} scale={[-1, 1, 1]}>
      <sphereGeometry args={[500, 60, 40]} />
      <meshBasicMaterial side={THREE.BackSide} />
    </mesh>
  );
}

interface Video360PlayerProps {
  videoUrl: string;
}

export function Video360Player({ videoUrl }: Video360PlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative bg-card overflow-hidden border",
        isFullscreen ? "h-screen w-screen rounded-none" : "w-full h-[600px] rounded-lg"
      )}
    >
      <Canvas camera={{ position: [0, 0, 0.1], fov: 75 }}>
        <Video360Sphere videoUrl={videoUrl} isPlaying={isPlaying} isMuted={isMuted} />
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          rotateSpeed={-0.5}
          minDistance={0.1}
          maxDistance={100}
        />
      </Canvas>

      <div className={cn(
        "absolute left-1/2 -translate-x-1/2 flex gap-3 bg-background/80 backdrop-blur-sm p-3 rounded-lg border shadow-lg",
        isFullscreen ? "bottom-10" : "bottom-6"
      )}>
        <Button
          size="icon"
          variant="outline"
          onClick={() => setIsPlaying(!isPlaying)}
          className={cn(isFullscreen ? "h-14 w-14" : "h-10 w-10")}
        >
          {isPlaying ? <Pause className={cn(isFullscreen ? "h-7 w-7" : "h-5 w-5")} /> : <Play className={cn(isFullscreen ? "h-7 w-7" : "h-5 w-5")} />}
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={() => setIsMuted(!isMuted)}
          className={cn(isFullscreen ? "h-14 w-14" : "h-10 w-10")}
        >
          {isMuted ? <VolumeX className={cn(isFullscreen ? "h-7 w-7" : "h-5 w-5")} /> : <Volume2 className={cn(isFullscreen ? "h-7 w-7" : "h-5 w-5")} />}
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={toggleFullscreen}
          className={cn(isFullscreen ? "h-14 w-14" : "h-10 w-10")}
        >
          {isFullscreen ? <Minimize className={cn(isFullscreen ? "h-7 w-7" : "h-5 w-5")} /> : <Maximize className={cn(isFullscreen ? "h-7 w-7" : "h-5 w-5")} />}
        </Button>
      </div>

      {!isFullscreen && (
        <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm px-4 py-2 rounded-lg border text-sm text-muted-foreground">
          Dra for å se rundt • Scroll for zoom
        </div>
      )}
    </div>
  );
}
