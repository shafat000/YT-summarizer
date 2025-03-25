import { SummaryContent } from "@/types";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Link2Icon, CodeIcon, FileTextIcon, ImageIcon, ExternalLinkIcon, XIcon, AlertTriangleIcon, YoutubeIcon, ClockIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose, ImageDialog } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { getSignedImageUrl, extractYouTubeVideoId, getYouTubeThumbnailUrl } from "@/services/supabaseService";

interface SummarySectionProps {
  summary?: SummaryContent;
  isLoading: boolean;
}

function formatTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export default function SummarySection({ summary, isLoading }: SummarySectionProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [imageLoading, setImageLoading] = useState<Record<string, boolean>>({});
  
  useEffect(() => {
    // Load Supabase image URLs when summary changes
    const loadImageUrls = async () => {
      if (!summary?.imageReferences?.length) return;
      
      const urlMap: Record<string, string> = {};
      const loadingMap: Record<string, boolean> = {};
      const errorsMap: Record<string, boolean> = {};
      
      for (const imagePath of summary.imageReferences) {
        try {
          // Mark this image as loading
          loadingMap[imagePath] = true;
          console.log(`Attempting to load URL for image: ${imagePath}`);
          
          // Check if it's a YouTube URL 
          const videoId = extractYouTubeVideoId(imagePath);
          if (videoId) {
            console.log(`Found YouTube URL for ${imagePath}, using thumbnail`);
            urlMap[imagePath] = getYouTubeThumbnailUrl(videoId);
            loadingMap[imagePath] = false;
            continue;
          }
          
          // Get signed URL that works for both public and private buckets
          const url = await getSignedImageUrl(imagePath);
          if (url) {
            console.log(`Successfully got URL for ${imagePath}: ${url}`);
            urlMap[imagePath] = url;
          } else {
            console.warn(`Failed to get URL for ${imagePath}`);
            errorsMap[imagePath] = true;
          }
        } catch (error) {
          console.error(`Error loading image URL for ${imagePath}:`, error);
          errorsMap[imagePath] = true;
        } finally {
          // Mark this image as no longer loading
          loadingMap[imagePath] = false;
        }
      }
      
      setImageUrls(urlMap);
      setImageLoading(loadingMap);
      setImageErrors(errorsMap);
    };
    
    loadImageUrls();
  }, [summary]);
  
  // Handle image load error
  const handleImageError = (imagePath: string) => {
    console.warn(`Failed to load image: ${imagePath}`);
    setImageErrors(prev => ({ ...prev, [imagePath]: true }));
    
    // Try YouTube thumbnail fallback if applicable
    const videoId = extractYouTubeVideoId(imagePath);
    if (videoId) {
      const thumbnailUrl = getYouTubeThumbnailUrl(videoId);
      console.log(`Attempting YouTube thumbnail fallback for ${imagePath}: ${thumbnailUrl}`);
      setImageUrls(prev => ({ ...prev, [imagePath]: thumbnailUrl }));
    }
  };
  
  if (isLoading) {
    return (
      <div className="w-full max-w-3xl mx-auto mt-8">
        <Card className="p-6 space-y-4">
          <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-4/6"></div>
          </div>
        </Card>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="w-full max-w-3xl mx-auto mt-8">
        <Card className="p-6 text-center text-muted-foreground">
          Enter a YouTube URL above to generate a summary
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto mt-8">
      <Card className="p-6 space-y-6">
        <div className="prose dark:prose-invert max-w-none">
          {/* Main Summary Text */}
          <div className="whitespace-pre-wrap">{summary.text}</div>

          {/* Timestamps and Key Points */}
          {summary.timestamps && summary.timestamps.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <ClockIcon className="w-5 h-5" />
                Timeline
              </h3>
              <div className="space-y-2">
                {summary.timestamps.map((item, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-sm font-mono text-muted-foreground">
                      {formatTimestamp(item.timestamp / 1000)}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm">
                        {item.type === 'key_point' && (
                          <Badge variant="secondary" className="mr-2">Key Point</Badge>
                        )}
                        {item.type === 'code' && (
                          <Badge variant="outline" className="mr-2">Code</Badge>
                        )}
                        {item.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Code Snippets */}
          {summary.code.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <CodeIcon className="w-5 h-5" />
                Code Examples
              </h3>
              {summary.code.map((snippet, index) => (
                <pre key={index} className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto">
                  <code>{snippet}</code>
                </pre>
              ))}
            </div>
          )}

          {/* Related Links */}
          {summary.links.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <Link2Icon className="w-5 h-5" />
                Related Links
              </h3>
              <ul className="list-disc list-inside">
                {summary.links.map((link, index) => (
                  <li key={index}>
                    <a 
                      href={link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Images */}
          {summary.imageReferences.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Visual References
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {summary.imageReferences.map((imageUrl, index) => (
                  <img
                    key={index}
                    src={imageUrl}
                    alt={`Reference ${index + 1}`}
                    className="rounded-lg shadow-md w-full h-auto"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
