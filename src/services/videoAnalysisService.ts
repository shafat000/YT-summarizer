import { SummaryContent, VideoDetails, TimeStampedContent } from "@/types";
import { fetchCaptions, processTranscript } from "./captionsService";
import jsPDF from "jspdf";

// This service would normally connect to your backend API
// For now, we'll simulate the API response with a delay

function extractVideoID(url: string): string | null {
  if (!url) return null;
  
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}

export async function getVideoDetails(url: string): Promise<VideoDetails> {
  const videoId = extractVideoID(url);
  
  if (!videoId) {
    throw new Error("Invalid YouTube URL");
  }

  try {
    // Use YouTube's oEmbed API to get basic video information
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const response = await fetch(oembedUrl);
    const data = await response.json();

    return {
      title: data.title,
      description: data.description || "Description not available",
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      channel: data.author_name,
      duration: data.duration || "Duration not available"
    };
  } catch (error) {
    console.error("Error fetching video details:", error);
    throw error;
  }
}

export async function generateSummary(videoId: string): Promise<SummaryContent> {
  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const videoDetails = await getVideoDetails(videoUrl);
    
    // Fetch and process captions
    let transcriptSummary = undefined;
    let timestamps: TimeStampedContent[] = [];
    let keyPoints: TimeStampedContent[] = [];
    let codeSnippets: string[] = [];
    
    try {
      const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
      if (apiKey) {
        const captions = await fetchCaptions(videoId, apiKey);
        const processedContent = await processTranscript(captions);
        
        transcriptSummary = processedContent.summary;
        keyPoints = processedContent.keyPoints;
        timestamps = [...processedContent.keyPoints, ...processedContent.codeBlocks]
          .sort((a, b) => a.timestamp - b.timestamp);
        
        // Extract code snippets
        codeSnippets = processedContent.codeBlocks.map(block => block.text);
      }
    } catch (error) {
      console.warn('Failed to process captions:', error);
      // Continue with basic summary if captions processing fails
    }

    // Create a detailed summary
    const summary: SummaryContent = {
      text: transcriptSummary || `This video titled "${videoDetails.title}" by ${videoDetails.channel} provides a comprehensive overview of the topic.
      
The content is structured to help viewers understand the subject matter through clear explanations and examples. The presenter breaks down complex concepts into digestible segments, making it easier for the audience to follow along.`,
      code: codeSnippets,
      links: [
        videoUrl,
        `https://www.youtube.com/channel/${videoDetails.channel}`
      ],
      imageReferences: [
        videoDetails.thumbnail
      ],
      timestamps,
      keyPoints,
      transcriptSummary
    };

    return summary;
  } catch (error) {
    console.error("Error generating summary:", error);
    throw error;
  }
}

export async function generatePDF(
  videoDetails: VideoDetails,
  summary: SummaryContent
): Promise<Blob> {
  try {
    // Create a new PDF document
    const doc = new jsPDF();
    const lineHeight = 10;
    let yPosition = 20;
    const maxWidth = 180;
    const pageHeight = doc.internal.pageSize.height;
    
    // Helper function to check if we need a new page
    const checkPageBreak = (neededSpace: number) => {
      if (yPosition + neededSpace > pageHeight - 20) {
        doc.addPage();
        yPosition = 20;
        return true;
      }
      return false;
    };
    
    // Add title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`Video Summary: ${videoDetails.title}`, 15, yPosition);
    yPosition += lineHeight * 1.5;
    
    // Add channel info
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Channel: ${videoDetails.channel}`, 15, yPosition);
    yPosition += lineHeight;
    doc.text(`Duration: ${videoDetails.duration}`, 15, yPosition);
    yPosition += lineHeight * 1.5;
    
    // Add horizontal line
    doc.setDrawColor(200, 200, 200);
    doc.line(15, yPosition, 195, yPosition);
    yPosition += lineHeight;
    
    // Add summary section
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Summary", 15, yPosition);
    yPosition += lineHeight;
    
    // Add summary text with paragraph splitting
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    // Split summary into paragraphs
    const paragraphs = summary.text.split('\n\n');
    for (const paragraph of paragraphs) {
      const splitText = doc.splitTextToSize(paragraph, maxWidth);
      
      checkPageBreak(splitText.length * 6 + lineHeight);
      
      doc.text(splitText, 15, yPosition);
      yPosition += splitText.length * 6 + lineHeight;
    }
    
    // Add code snippets section if available
    if (summary.code.length > 0) {
      checkPageBreak(lineHeight * 2);
      
      yPosition += lineHeight / 2;
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Code Snippets", 15, yPosition);
      yPosition += lineHeight;
      
      doc.setFontSize(9);
      doc.setFont("courier", "normal");
      
      for (const codeSnippet of summary.code) {
        // Clean up the code (remove markdown formatting)
        const languageMatch = codeSnippet.match(/```(\w+)/);
        const language = languageMatch ? languageMatch[1] : 'code';
        
        const cleanedCode = codeSnippet.replace(/```\w*\n|```/g, "");
        const splitCode = doc.splitTextToSize(cleanedCode, maxWidth);
        
        // Check if we need a new page and add language indicator
        checkPageBreak(splitCode.length * 5 + lineHeight * 2);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        doc.text(`Language: ${language}`, 15, yPosition);
        yPosition += lineHeight;
        
        doc.setFontSize(8);
        doc.setFont("courier", "normal");
        doc.text(splitCode, 15, yPosition);
        yPosition += splitCode.length * 5 + lineHeight * 1.5;
      }
    }
    
    // Add links section if available
    if (summary.links.length > 0) {
      checkPageBreak(lineHeight * 2);
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Referenced Links", 15, yPosition);
      yPosition += lineHeight;
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 255);
      
      for (const link of summary.links) {
        checkPageBreak(lineHeight * 1.5);
        
        const splitLink = doc.splitTextToSize(link, maxWidth);
        doc.text(splitLink, 15, yPosition);
        yPosition += splitLink.length * 6 + 2;
      }
      
      doc.setTextColor(0, 0, 0);
    }
    
    // Add image references section if available
    if (summary.imageReferences.length > 0) {
      checkPageBreak(lineHeight * 2);
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Image References", 15, yPosition);
      yPosition += lineHeight;
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      for (const image of summary.imageReferences) {
        checkPageBreak(lineHeight);
        
        doc.text(`• ${image}`, 15, yPosition);
        yPosition += lineHeight;
      }
    }
    
    // Add document metadata
    doc.setProperties({
      title: `${videoDetails.title} - Summary`,
      subject: 'YouTube Video Summary',
      author: 'AI Summarizer',
      keywords: 'youtube, summary, ai',
      creator: 'YouTube AI Summarizer'
    });
    
    // Output the PDF as a blob
    const pdfBlob = doc.output('blob');
    return pdfBlob;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  }
}

export function getEmbedUrl(url: string): string {
  const videoId = extractVideoID(url);
  return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
}
