import { useRef, useState, useEffect, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { XR, createXRStore } from "@react-three/xr";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Loader2, RefreshCw, Glasses } from "lucide-react";
import { cn } from "@/lib/utils";

interface Video360SphereProps {
  videoElement: HTMLVideoElement | null;
}

function Video360Sphere({ videoElement }: Video360SphereProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const textureRef = useRef<THREE.VideoTexture | null>(null);

  useEffect(() => {
    if (!videoElement) return;

    const texture = new THREE.VideoTexture(videoElement);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.format = THREE.RGBAFormat;
    texture.generateMipmaps = false;
    // iOS/older WebGL compatibility
    texture.colorSpace = THREE.SRGBColorSpace;
    textureRef.current = texture;

    if (meshRef.current) {
      (meshRef.current.material as THREE.MeshBasicMaterial).map = texture;
      (meshRef.current.material as THREE.MeshBasicMaterial).needsUpdate = true;
    }

    return () => {
      texture.dispose();
      textureRef.current = null;
    };
  }, [videoElement]);

  // Update texture every frame - CRITICAL for VR/mobile browsers
  useFrame(() => {
    const texture = textureRef.current;
    if (videoElement && texture && videoElement.readyState >= videoElement.HAVE_CURRENT_DATA) {
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

const xrStore = createXRStore();

export function Video360Player({ videoUrl }: Video360PlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showInitialPlay, setShowInitialPlay] = useState(true);
  const [videoReady, setVideoReady] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [vrSupported, setVrSupported] = useState(false);

  // Check WebXR VR support
  useEffect(() => {
    navigator.xr?.isSessionSupported('immersive-vr')
      .then(supported => setVrSupported(supported))
      .catch(() => setVrSupported(false));
  }, []);

  // Create video element in DOM (required for iOS Safari)
  useEffect(() => {
    // Create hidden container for video element
    const container = document.createElement("div");
    container.style.cssText = "position:absolute;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;";
    document.body.appendChild(container);
    videoContainerRef.current = container;

    // Create video element
    const video = document.createElement("video");
    
    // CRITICAL: Set all attributes BEFORE src for iOS compatibility
    video.crossOrigin = "anonymous";
    video.playsInline = true;
    video.muted = true;
    video.loop = true;
    video.preload = "auto";
    video.setAttribute("webkit-playsinline", "true");
    video.setAttribute("x-webkit-airplay", "allow");
    
    // Append to DOM container (required for iOS)
    container.appendChild(video);
    
    // Now set the source
    video.src = videoUrl;
    videoRef.current = video;

    const handleCanPlay = () => {
      console.log("Video can play");
      setIsLoading(false);
      setHasError(false);
      setVideoReady(true);
    };

    const handleLoadedData = () => {
      console.log("Video data loaded");
    };

    const handleError = (e: Event) => {
      const videoEl = e.target as HTMLVideoElement;
      const error = videoEl.error;
      const errorMessage = error?.message || "Failed to load video";
      console.error("Video error:", error);
      setIsLoading(false);
      setHasError(true);
      setErrorMessage(errorMessage);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("loadeddata", handleLoadedData);
    video.addEventListener("error", handleError);
    video.addEventListener("ended", handleEnded);

    // Start loading
    video.load();

    return () => {
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("loadeddata", handleLoadedData);
      video.removeEventListener("error", handleError);
      video.removeEventListener("ended", handleEnded);
      video.pause();
      video.src = "";
      video.load();
      
      // Remove from DOM
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
      videoRef.current = null;
      videoContainerRef.current = null;
    };
  }, [videoUrl, retryKey]);

  // Handle muted state changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // CRITICAL: Direct play from user interaction (iOS requirement)
  const handlePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      // Call play() DIRECTLY in the click handler (iOS requirement)
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
            setShowInitialPlay(false);
          })
          .catch((error) => {
            console.warn("Play failed:", error);
            // Still update state to show we tried
            setShowInitialPlay(true);
          });
      }
    }
  }, [isPlaying]);

  // Initial play handler - also direct from user interaction
  const handleInitialPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    // Call play() DIRECTLY in the click handler (iOS requirement)
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
          setShowInitialPlay(false);
        })
        .catch((error) => {
          console.warn("Initial play failed:", error);
        });
    }
  }, []);

  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsLoading(true);
    setErrorMessage("");
    setVideoReady(false);
    setShowInitialPlay(true);
    // Increment key to force remount and reload video
    setRetryKey(prev => prev + 1);
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
      <Canvas key={retryKey} camera={{ position: [0, 0, 0.1], fov: 75 }}>
        <XR store={xrStore}>
          <Video360Sphere videoElement={videoReady ? videoRef.current : null} />
          <OrbitControls
            enableZoom={true}
            enablePan={false}
            rotateSpeed={-0.5}
            minDistance={0.1}
            maxDistance={100}
          />
        </XR>
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

      {/* Initial play overlay - iOS requires user interaction to start video */}
      {showInitialPlay && !isLoading && !hasError && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm cursor-pointer"
          onClick={handleInitialPlay}
        >
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center mx-auto mb-4 hover:bg-primary transition-colors">
              <Play className="h-10 w-10 text-primary-foreground ml-1" />
            </div>
            <p className="text-foreground font-medium">Trykk for å spille</p>
            <p className="text-sm text-muted-foreground mt-1">360° video</p>
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
          onClick={handlePlayPause}
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
        {vrSupported && (
          <Button
            size="icon"
            variant="outline"
            onClick={() => xrStore.enterVR()}
            className={cn(isFullscreen ? "h-14 w-14" : "h-10 w-10")}
            title="Enter VR"
          >
            <Glasses className={cn(isFullscreen ? "h-7 w-7" : "h-5 w-5")} />
          </Button>
        )}
      </div>

      {!isFullscreen && !isLoading && !hasError && !showInitialPlay && (
        <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm px-4 py-2 rounded-lg border text-sm text-muted-foreground">
          Dra for å se rundt • Scroll for zoom
        </div>
      )}
    </div>
  );
}
