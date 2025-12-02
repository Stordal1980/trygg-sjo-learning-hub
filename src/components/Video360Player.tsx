import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  return (
    <div className="relative w-full h-[600px] bg-card rounded-lg overflow-hidden border">
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

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 bg-background/80 backdrop-blur-sm p-3 rounded-lg border shadow-lg">
        <Button
          size="icon"
          variant="outline"
          onClick={() => setIsPlaying(!isPlaying)}
          className="h-10 w-10"
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={() => setIsMuted(!isMuted)}
          className="h-10 w-10"
        >
          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </Button>
      </div>

      <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm px-4 py-2 rounded-lg border text-sm text-muted-foreground">
        Dra for å se rundt • Scroll for zoom
      </div>
    </div>
  );
}
