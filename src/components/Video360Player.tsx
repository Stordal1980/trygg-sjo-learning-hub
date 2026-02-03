import { useRef, useState, useEffect, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Video360SphereProps {
  videoUrl: string;
  isPlaying: boolean;
  isMuted: boolean;
  onVideoReady: () => void;
  onVideoError: (error: string) => void;
  onAutoplayBlocked: () => void;
}

function Video360Sphere({ 
  videoUrl, 
  isPlaying, 
  isMuted, 
  onVideoReady, 
  onVideoError,
  onAutoplayBlocked 
}: Video360SphereProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const textureRef = useRef<THREE.VideoTexture | null>(null);

  useEffect(() => {
    const video = document.createElement("video");
    
    // CRITICAL: Set attributes BEFORE setting src for mobile/VR browsers
    video.crossOrigin = "anonymous";
    video.playsInline = true;
    video.muted = true; // Start muted for autoplay compatibility
    video.loop = true;
    video.preload = "auto";
    video.setAttribute("webkit-playsinline", "true");
    video.setAttribute("x-webkit-airplay", "allow");
    
    // Now set the source
    video.src = videoUrl;
    videoRef.current = video;

    const texture = new THREE.VideoTexture(video);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBAFormat;
    texture.generateMipmaps = false;
    textureRef.current = texture;

    if (meshRef.current) {
      (meshRef.current.material as THREE.MeshBasicMaterial).map = texture;
      (meshRef.current.material as THREE.MeshBasicMaterial).needsUpdate = true;
    }

    // Handle video ready state
    const handleCanPlay = () => {
      console.log("Video can play");
      onVideoReady();
    };

    const handleLoadedData = () => {
      console.log("Video data loaded");
    };

    const handleError = (e: Event) => {
      const videoEl = e.target as HTMLVideoElement;
      const error = videoEl.error;
      const errorMessage = error?.message || "Failed to load video";
      console.error("Video error:", error);
      onVideoError(errorMessage);
    };

    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("error", handleError);

    // Start loading
    video.load();

    return () => {
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("error", handleError);
      video.pause();
      video.src = "";
      video.load();
      texture.dispose();
      videoRef.current = null;
      textureRef.current = null;
    };
  }, [videoUrl, onVideoReady, onVideoError]);

  // Handle muted state changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Handle play/pause
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.warn("Autoplay blocked:", error);
          onAutoplayBlocked();
        });
      }
    } else {
      video.pause();
    }
  }, [isPlaying, onAutoplayBlocked]);

  // Update texture every frame - CRITICAL for VR browsers
  useFrame(() => {
    const video = videoRef.current;
    const texture = textureRef.current;
    
    if (video && texture && video.readyState >= video.HAVE_CURRENT_DATA) {
      texture.needsUpdate = true;
    }
  });

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
  const [isMuted, setIsMuted] = useState(true); // Start muted for autoplay
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showTapToPlay, setShowTapToPlay] = useState(false);

  const handleVideoReady = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  const handleVideoError = useCallback((error: string) => {
    setIsLoading(false);
    setHasError(true);
    setErrorMessage(error);
  }, []);

  const handleAutoplayBlocked = useCallback(() => {
    setIsPlaying(false);
    setShowTapToPlay(true);
  }, []);

  const handleTapToPlay = useCallback(() => {
    setShowTapToPlay(false);
    setIsPlaying(true);
  }, []);

  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsLoading(true);
    setErrorMessage("");
  }, []);

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
        <Video360Sphere 
          videoUrl={videoUrl} 
          isPlaying={isPlaying} 
          isMuted={isMuted}
          onVideoReady={handleVideoReady}
          onVideoError={handleVideoError}
          onAutoplayBlocked={handleAutoplayBlocked}
        />
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          rotateSpeed={-0.5}
          minDistance={0.1}
          maxDistance={100}
        />
      </Canvas>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Laster video...</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center">
            <p className="text-destructive mb-2">Kunne ikke laste video</p>
            <p className="text-sm text-muted-foreground mb-4">{errorMessage}</p>
            <Button onClick={handleRetry} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Prøv igjen
            </Button>
          </div>
        </div>
      )}

      {/* Tap to play overlay (for autoplay blocked) */}
      {showTapToPlay && !isLoading && !hasError && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm cursor-pointer"
          onClick={handleTapToPlay}
        >
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center mx-auto mb-4 hover:bg-primary transition-colors">
              <Play className="h-10 w-10 text-primary-foreground ml-1" />
            </div>
            <p className="text-foreground font-medium">Trykk for å spille</p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className={cn(
        "absolute left-1/2 -translate-x-1/2 flex gap-3 bg-background/80 backdrop-blur-sm p-3 rounded-lg border shadow-lg",
        isFullscreen ? "bottom-10" : "bottom-6"
      )}>
        <Button
          size="icon"
          variant="outline"
          onClick={() => {
            setShowTapToPlay(false);
            setIsPlaying(!isPlaying);
          }}
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

      {!isFullscreen && !isLoading && !hasError && !showTapToPlay && (
        <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm px-4 py-2 rounded-lg border text-sm text-muted-foreground">
          Dra for å se rundt • Scroll for zoom
        </div>
      )}
    </div>
  );
}
