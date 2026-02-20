import { useRef, useState, useEffect, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { XR, createXRStore } from "@react-three/xr";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, Loader2, RefreshCw, Glasses, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// --- WebGL support detection ---
function isWebGLSupported(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    return !!gl;
  } catch {
    return false;
  }
}

// --- 360 Sphere (Three.js) ---
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

// --- Fallback HTML5 Video Player ---
function FallbackVideoPlayer({ videoUrl }: { videoUrl: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handlePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [isPlaying]);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;
  }, [isMuted]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative bg-card overflow-hidden border",
        isFullscreen ? "h-screen w-screen rounded-none" : "w-full h-[600px] rounded-lg"
      )}
    >
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center gap-2 bg-yellow-500/90 text-yellow-950 px-4 py-2 rounded-lg text-sm font-medium">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>360°-visning er ikke støttet på denne enheten. Videoen vises som vanlig video.</span>
      </div>

      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-full object-contain bg-black"
        playsInline
        muted={isMuted}
        loop
        crossOrigin="anonymous"
      />

      {/* Controls */}
      <div className={cn(
        "absolute left-1/2 -translate-x-1/2 flex gap-3 bg-background/80 backdrop-blur-sm p-3 rounded-lg border shadow-lg",
        isFullscreen ? "bottom-10" : "bottom-6"
      )}>
        <Button size="icon" variant="outline" onClick={handlePlayPause} className={cn(isFullscreen ? "h-14 w-14" : "h-10 w-10")}>
          {isPlaying ? <Pause className={cn(isFullscreen ? "h-7 w-7" : "h-5 w-5")} /> : <Play className={cn(isFullscreen ? "h-7 w-7" : "h-5 w-5")} />}
        </Button>
        <Button size="icon" variant="outline" onClick={() => setIsMuted(!isMuted)} className={cn(isFullscreen ? "h-14 w-14" : "h-10 w-10")}>
          {isMuted ? <VolumeX className={cn(isFullscreen ? "h-7 w-7" : "h-5 w-5")} /> : <Volume2 className={cn(isFullscreen ? "h-7 w-7" : "h-5 w-5")} />}
        </Button>
        <Button size="icon" variant="outline" onClick={toggleFullscreen} className={cn(isFullscreen ? "h-14 w-14" : "h-10 w-10")}>
          {isFullscreen ? <Minimize className={cn(isFullscreen ? "h-7 w-7" : "h-5 w-5")} /> : <Maximize className={cn(isFullscreen ? "h-7 w-7" : "h-5 w-5")} />}
        </Button>
      </div>
    </div>
  );
}

// --- Main 360 Player ---
interface Video360PlayerProps {
  videoUrl: string;
}

const xrStore = createXRStore();

export function Video360Player({ videoUrl }: Video360PlayerProps) {
  const [webglSupported] = useState(() => isWebGLSupported());
  const [webglCrashed, setWebglCrashed] = useState(false);

  // If WebGL not supported or Canvas crashed, show fallback
  if (!webglSupported || webglCrashed) {
    return <FallbackVideoPlayer videoUrl={videoUrl} />;
  }

  return (
    <Video360CanvasPlayer
      videoUrl={videoUrl}
      onWebGLError={() => setWebglCrashed(true)}
    />
  );
}

// --- Canvas-based 360 player (extracted) ---
interface Video360CanvasPlayerProps {
  videoUrl: string;
  onWebGLError: () => void;
}

function Video360CanvasPlayer({ videoUrl, onWebGLError }: Video360CanvasPlayerProps) {
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
    const container = document.createElement("div");
    container.style.cssText = "position:absolute;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;";
    document.body.appendChild(container);
    videoContainerRef.current = container;

    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.playsInline = true;
    video.muted = true;
    video.loop = true;
    video.preload = "auto";
    video.setAttribute("webkit-playsinline", "true");
    video.setAttribute("x-webkit-airplay", "allow");
    container.appendChild(video);
    video.src = videoUrl;
    videoRef.current = video;

    const handleCanPlay = () => {
      setIsLoading(false);
      setHasError(false);
      setVideoReady(true);
    };
    const handleError = (e: Event) => {
      const videoEl = e.target as HTMLVideoElement;
      const error = videoEl.error;
      setIsLoading(false);
      setHasError(true);
      setErrorMessage(error?.message || "Failed to load video");
    };
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("error", handleError);
    video.addEventListener("ended", handleEnded);
    video.load();

    return () => {
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("error", handleError);
      video.removeEventListener("ended", handleEnded);
      video.pause();
      video.src = "";
      video.load();
      if (container.parentNode) container.parentNode.removeChild(container);
      videoRef.current = null;
      videoContainerRef.current = null;
    };
  }, [videoUrl, retryKey]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;
  }, [isMuted]);

  const handlePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play()
        .then(() => { setIsPlaying(true); setShowInitialPlay(false); })
        .catch(() => setShowInitialPlay(true));
    }
  }, [isPlaying]);

  const handleInitialPlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play()
      .then(() => { setIsPlaying(true); setShowInitialPlay(false); })
      .catch(() => {});
  }, []);

  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsLoading(true);
    setErrorMessage("");
    setVideoReady(false);
    setShowInitialPlay(true);
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
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative bg-card overflow-hidden border",
        isFullscreen ? "h-screen w-screen rounded-none" : "w-full h-[600px] rounded-lg"
      )}
    >
      <Canvas
        key={retryKey}
        gl={{ preserveDrawingBuffer: true, alpha: false }}
        camera={{ position: [0, 0, 0.1], fov: 75 }}
        onCreated={({ gl }) => {
          // Detect WebGL context loss and fall back
          const canvas = gl.domElement;
          canvas.addEventListener("webglcontextlost", (e) => {
            e.preventDefault();
            console.warn("WebGL context lost, falling back to HTML5 video");
            onWebGLError();
          });
        }}
      >
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

      {/* Initial play overlay */}
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
        <Button size="icon" variant="outline" onClick={handlePlayPause} className={cn(isFullscreen ? "h-14 w-14" : "h-10 w-10")}>
          {isPlaying ? <Pause className={cn(isFullscreen ? "h-7 w-7" : "h-5 w-5")} /> : <Play className={cn(isFullscreen ? "h-7 w-7" : "h-5 w-5")} />}
        </Button>
        <Button size="icon" variant="outline" onClick={() => setIsMuted(!isMuted)} className={cn(isFullscreen ? "h-14 w-14" : "h-10 w-10")}>
          {isMuted ? <VolumeX className={cn(isFullscreen ? "h-7 w-7" : "h-5 w-5")} /> : <Volume2 className={cn(isFullscreen ? "h-7 w-7" : "h-5 w-5")} />}
        </Button>
        <Button size="icon" variant="outline" onClick={toggleFullscreen} className={cn(isFullscreen ? "h-14 w-14" : "h-10 w-10")}>
          {isFullscreen ? <Minimize className={cn(isFullscreen ? "h-7 w-7" : "h-5 w-5")} /> : <Maximize className={cn(isFullscreen ? "h-7 w-7" : "h-5 w-5")} />}
        </Button>
        {vrSupported && (
          <Button size="icon" variant="outline" onClick={() => xrStore.enterVR()} className={cn(isFullscreen ? "h-14 w-14" : "h-10 w-10")} title="Enter VR">
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
