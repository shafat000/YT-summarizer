
import { Button } from "@/components/ui/button";
import { SummaryContent, VideoDetails } from "@/types";
import { generatePDF } from "@/services/videoAnalysisService";
import { useState } from "react";
import { FileDownIcon, Loader2Icon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface PDFExportProps {
  videoDetails?: VideoDetails;
  summary?: SummaryContent;
  isLoading: boolean;
}

const PDFExport = ({ videoDetails, summary, isLoading }: PDFExportProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  
  if ((!videoDetails || !summary) && !isLoading) {
    return null;
  }
  
  const handleExport = async () => {
    if (!videoDetails || !summary) return;
    
    try {
      setIsGenerating(true);
      const pdfBlob = await generatePDF(videoDetails, summary);
      
      // Create a download link and trigger it
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${videoDetails.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_summary.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
      
      toast({
        title: "PDF Downloaded",
        description: "Your summary PDF has been generated successfully.",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        variant: "destructive",
        title: "PDF Generation Failed",
        description: "There was an error creating your PDF. Please try again."
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto mt-8 mb-12 pdf-section">
      <div className="glass-panel p-6 shadow-lg flex flex-col items-center justify-center">
        <h2 className="text-xl font-medium mb-4 text-center">Export Summary</h2>
        
        {isLoading ? (
          <div className="h-10 w-40 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg"></div>
        ) : videoDetails && summary ? (
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Download a comprehensive PDF summary of this video including all references, 
              code snippets, and content categorization.
            </p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={handleExport} 
                    disabled={isGenerating}
                    className="button-effect bg-primary hover:bg-primary/90 h-12 px-6"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                        Generating PDF...
                      </>
                    ) : (
                      <>
                        <FileDownIcon className="mr-2 h-4 w-4" />
                        Download PDF Summary
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Download a detailed summary with code snippets and references</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default PDFExport;
