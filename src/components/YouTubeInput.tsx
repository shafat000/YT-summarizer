
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface YouTubeInputProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

const YouTubeInput = ({ onSubmit, isLoading }: YouTubeInputProps) => {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const validateUrl = (url: string): boolean => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
    return youtubeRegex.test(url);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setError("Please enter a YouTube URL");
      return;
    }
    
    if (!validateUrl(url)) {
      setError("Please enter a valid YouTube URL");
      return;
    }
    
    setError("");
    onSubmit(url);
  };

  return (
    <div className="w-full max-w-3xl mx-auto yt-section">
      <div className="glass-panel p-6 shadow-lg">
        <h2 className="text-xl font-medium mb-4 text-center">Enter YouTube Video URL</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError("");
              }}
              className="flex-1 input-transition h-12"
              disabled={isLoading}
            />
            <Button 
              type="submit" 
              className="button-effect h-12 px-6 bg-primary hover:bg-primary/90"
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Analyze Video"}
            </Button>
          </div>
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          <p className="text-muted-foreground text-sm text-center mt-2">
            Paste a YouTube video URL to generate a comprehensive summary
          </p>
        </form>
      </div>
    </div>
  );
};

export default YouTubeInput;
