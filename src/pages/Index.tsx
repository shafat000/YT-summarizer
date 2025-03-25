
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import YouTubeInput from "@/components/YouTubeInput";
import VideoPreview from "@/components/VideoPreview";
import SummarySection from "@/components/SummarySection";
import PDFExport from "@/components/PDFExport";
import ImageUploader from "@/components/ImageUploader";
import { SummaryData } from "@/types";
import { getVideoDetails, generateSummary, getEmbedUrl } from "@/services/videoAnalysisService";
import { getImageReferences } from "@/services/supabaseService";

const Index = () => {
  const { toast } = useToast();
  const [videoUrl, setVideoUrl] = useState("");
  const [videoId, setVideoId] = useState("");
  const [embedUrl, setEmbedUrl] = useState("");
  const [summaryData, setSummaryData] = useState<SummaryData>({
    isLoading: false
  });

  const extractVideoId = (url: string): string => {
    const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return videoIdMatch ? videoIdMatch[1] : "";
  };

  const handleSubmit = async (url: string) => {
    try {
      setVideoUrl(url);
      const extractedVideoId = extractVideoId(url);
      setVideoId(extractedVideoId);
      setEmbedUrl(getEmbedUrl(url));
      setSummaryData({ isLoading: true });
      
      // Get video details
      const details = await getVideoDetails(url);
      setSummaryData((prev) => ({ ...prev, videoDetails: details }));
      
      if (!extractedVideoId) {
        throw new Error("Could not extract video ID");
      }
      
      // Generate summary
      const summary = await generateSummary(extractedVideoId);
      
      // Get additional images from Supabase
      const supabaseImages = await getImageReferences(extractedVideoId);
      
      // Ensure summary has imageReferences before trying to spread them
      const combinedSummary = {
        ...summary,
        imageReferences: [...(summary.imageReferences || []), ...supabaseImages]
      };
      
      setSummaryData((prev) => ({ 
        ...prev, 
        summary: combinedSummary, 
        isLoading: false 
      }));
      
      toast({
        title: "Summary Generated",
        description: "Your video summary is ready to view and download.",
      });
    } catch (error) {
      console.error("Error analyzing video:", error);
      setSummaryData({
        isLoading: false,
        error: error instanceof Error ? error.message : "An unknown error occurred"
      });
      
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to analyze video",
      });
    }
  };

  // Handle successful image upload
  const handleImageUploadSuccess = (imageUrl: string) => {
    // Add the new image to the summary
    setSummaryData((prev) => {
      if (!prev.summary) return prev;
      
      return {
        ...prev,
        summary: {
          ...prev.summary,
          imageReferences: [...(prev.summary.imageReferences || []), imageUrl]
        }
      };
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-100 dark:from-slate-900 dark:to-slate-800 pt-8 pb-16 px-4">
      <div className="mx-auto max-w-4xl">
        <header className="text-center mb-12 animate-fade-in">
          <h1 className="text-4xl font-bold mb-3 tracking-tight">YouTube AI Summarizer</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Transform any YouTube video into a comprehensive, organized summary with just one click
          </p>
        </header>
        
        <YouTubeInput onSubmit={handleSubmit} isLoading={summaryData.isLoading} />
        
        <VideoPreview 
          embedUrl={embedUrl} 
          videoDetails={summaryData.videoDetails} 
          isLoading={summaryData.isLoading} 
        />
        
        {videoId && !summaryData.isLoading && (
          <ImageUploader 
            videoId={videoId} 
            onSuccess={handleImageUploadSuccess}
          />
        )}
        
        <SummarySection 
          summary={summaryData.summary} 
          isLoading={summaryData.isLoading} 
        />
        
        <PDFExport 
          videoDetails={summaryData.videoDetails} 
          summary={summaryData.summary} 
          isLoading={summaryData.isLoading} 
        />
      </div>
    </div>
  );
};

export default Index;
