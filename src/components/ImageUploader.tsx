
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadImage, storeImageReference, extractYouTubeVideoId, getYouTubeThumbnailUrl } from "@/services/supabaseService";
import { useToast } from "@/components/ui/use-toast";
import { YoutubeIcon, ImageIcon, UploadIcon, AlertCircleIcon } from "lucide-react";
import { ImageDialog } from "@/components/ui/dialog";

interface ImageUploaderProps {
  videoId: string;
  onSuccess?: (imageUrl: string) => void;
}

const ImageUploader = ({ videoId, onSuccess }: ImageUploaderProps) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files && e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setYoutubeUrl(""); // Clear YouTube URL when file is selected
      
      // Create a preview URL
      const previewUrl = URL.createObjectURL(selectedFile);
      setPreviewImage(previewUrl);
      
      // Clean up the URL when component unmounts or when file changes
      return () => URL.revokeObjectURL(previewUrl);
    }
  };

  // Handle YouTube URL input
  const handleYoutubeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setYoutubeUrl(url);
    setFile(null); // Clear file selection when YouTube URL is provided
    
    // Extract YouTube video ID and show thumbnail preview if valid
    const videoId = extractYouTubeVideoId(url);
    if (videoId) {
      setPreviewImage(getYouTubeThumbnailUrl(videoId));
    } else {
      setPreviewImage(null);
    }
    
    // Reset file input
    const fileInput = document.getElementById('image-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleUpload = async () => {
    if (!file && !youtubeUrl) {
      toast({
        variant: "destructive",
        title: "No content selected",
        description: "Please select an image file or provide a YouTube URL."
      });
      return;
    }

    if (!videoId) {
      toast({
        variant: "destructive",
        title: "Missing video ID",
        description: "A video ID is required to upload an image."
      });
      return;
    }

    setIsUploading(true);

    try {
      let imagePath: string | null = null;
      
      // Handle YouTube URL
      if (youtubeUrl) {
        const videoId = extractYouTubeVideoId(youtubeUrl);
        if (!videoId) {
          throw new Error("Invalid YouTube URL");
        }
        
        // Store YouTube URL as reference
        imagePath = youtubeUrl;
        console.log(`Using YouTube URL: ${youtubeUrl} with video ID: ${videoId}`);
      } else if (file) {
        // Upload to Supabase storage - returns bucket/path format
        imagePath = await uploadImage(file);
        console.log(`File uploaded, path: ${imagePath}`);
      }
      
      if (!imagePath) {
        throw new Error("Failed to process image or YouTube URL");
      }
      
      console.log(`Storing reference: ${imagePath} for video ID: ${videoId}`);
      
      // Store reference in database
      const success = await storeImageReference(videoId, imagePath);
      
      if (!success) {
        throw new Error("Failed to store image reference");
      }
      
      toast({
        title: youtubeUrl ? "YouTube thumbnail added" : "Image uploaded successfully",
        description: youtubeUrl ? 
          "YouTube video thumbnail has been added to your references." : 
          "Your image has been uploaded and saved."
      });
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess(imagePath);
      }
      
      // Reset form
      setFile(null);
      setYoutubeUrl("");
      setPreviewImage(null);
      const fileInput = document.getElementById('image-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
    } catch (error) {
      console.error("Error uploading content:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload content"
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto mt-4 p-4 bg-white/50 dark:bg-black/50 rounded-lg border">
      <h3 className="text-lg font-medium mb-3">Add Visual References</h3>
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* File Upload Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <ImageIcon className="w-4 h-4" />
              <span>Upload Image</span>
            </label>
            <Input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isUploading || !!youtubeUrl}
              className="cursor-pointer"
            />
            {file && (
              <div className="p-2 border rounded bg-secondary/10">
                <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" />
                  <span>Selected: {file.name}</span>
                </p>
                {previewImage && (
                  <div className="mt-2">
                    <button 
                      onClick={() => setShowPreview(true)}
                      className="text-xs text-blue-500 hover:text-blue-700 underline"
                    >
                      Preview image
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* YouTube URL Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <YoutubeIcon className="w-4 h-4 text-red-500" />
              <span>Add YouTube Thumbnail</span>
            </label>
            <Input
              type="text"
              placeholder="YouTube video URL"
              value={youtubeUrl}
              onChange={handleYoutubeChange}
              disabled={isUploading || !!file}
              className="placeholder:text-muted-foreground/50"
            />
            {youtubeUrl && extractYouTubeVideoId(youtubeUrl) && (
              <div className="p-2 border rounded bg-secondary/10">
                <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                  <YoutubeIcon className="w-3 h-3 text-red-500" />
                  <span>YouTube URL: {youtubeUrl}</span>
                </p>
                {previewImage && (
                  <div className="mt-2">
                    <button 
                      onClick={() => setShowPreview(true)}
                      className="text-xs text-blue-500 hover:text-blue-700 underline"
                    >
                      Preview thumbnail
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="pt-2">
          <Button 
            onClick={handleUpload} 
            disabled={(!file && !youtubeUrl) || isUploading}
            className="w-full flex items-center gap-2"
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <UploadIcon className="w-4 h-4" />
                <span>{file ? "Upload Image" : youtubeUrl ? "Add YouTube Thumbnail" : "Add Reference"}</span>
              </>
            )}
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground bg-secondary/10 p-2 rounded flex items-start gap-2">
          <AlertCircleIcon className="w-4 h-4 mt-0.5 shrink-0" />
          <p>
            Make sure your Supabase bucket has public access enabled to view images. 
            For YouTube thumbnails, only the URL needs to be stored and the thumbnail will display automatically.
          </p>
        </div>
      </div>
      
      {/* Image preview dialog */}
      {previewImage && (
        <ImageDialog 
          src={previewImage} 
          alt={file ? file.name : "YouTube thumbnail preview"}
          isOpen={showPreview} 
          onOpenChange={setShowPreview} 
        />
      )}
    </div>
  );
};

export default ImageUploader;
