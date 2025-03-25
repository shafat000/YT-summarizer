import { VideoDetails } from "@/types";
import { Card } from "@/components/ui/card";

interface VideoPreviewProps {
  embedUrl: string;
  videoDetails?: VideoDetails;
  isLoading: boolean;
}

export default function VideoPreview({ embedUrl, videoDetails, isLoading }: VideoPreviewProps) {
  if (isLoading) {
    return (
      <div className="w-full max-w-3xl mx-auto mt-8">
        <Card className="aspect-video bg-gray-200 animate-pulse rounded-lg"></Card>
      </div>
    );
  }

  if (!embedUrl || !videoDetails) {
    return null;
  }

  return (
    <div className="w-full max-w-3xl mx-auto mt-8">
      <Card className="overflow-hidden">
        <div className="aspect-video">
          <iframe
            src={embedUrl}
            title={videoDetails.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
        <div className="p-4">
          <h2 className="text-xl font-semibold mb-2">{videoDetails.title}</h2>
          <p className="text-sm text-muted-foreground">{videoDetails.channel}</p>
        </div>
      </Card>
    </div>
  );
}
