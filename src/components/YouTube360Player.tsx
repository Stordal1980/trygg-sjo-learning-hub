import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface YouTube360PlayerProps {
  videoUrl: string;
  className?: string;
}

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  // If it's already just an ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;

  return null;
}

export function YouTube360Player({ videoUrl, className }: YouTube360PlayerProps) {
  const videoId = useMemo(() => extractYouTubeId(videoUrl), [videoUrl]);

  if (!videoId) {
    return (
      <div className={cn("w-full aspect-video bg-muted rounded-lg flex items-center justify-center", className)}>
        <p className="text-muted-foreground text-sm">Ugyldig YouTube-URL</p>
      </div>
    );
  }

  return (
    <div className={cn("w-full aspect-video rounded-lg overflow-hidden", className)}>
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?rel=0`}
        title="360° video"
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}
