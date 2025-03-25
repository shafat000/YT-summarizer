import { createClient, User, AuthError } from '@supabase/supabase-js';

// Initialize Supabase client with environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Authentication functions
export async function signUp(email: string, password: string): Promise<{ user: User | null; error: AuthError | null }> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: {
          email_confirm: true
        }
      }
    });

    if (error) throw error;

    // Check if email confirmation is required
    if (data?.user?.identities?.length === 0) {
      throw new Error("Email already registered. Please check your inbox for confirmation email.");
    }

    return { user: data.user, error: null };
  } catch (error) {
    console.error('Error signing up:', error);
    return { user: null, error: error as AuthError };
  }
}

export async function signIn(email: string, password: string): Promise<{ user: User | null; error: AuthError | null }> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    return { user: data.user, error: null };
  } catch (error) {
    console.error('Error signing in:', error);
    return { user: null, error: error as AuthError };
  }
}

export async function signOut(): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error signing out:', error);
    return { error: error as AuthError };
  }
}

export async function getCurrentUser(): Promise<{ user: User | null; error: AuthError | null }> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return { user, error: null };
  } catch (error) {
    console.error('Error getting current user:', error);
    return { user: null, error: error as AuthError };
  }
}

export async function resetPassword(email: string): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error resetting password:', error);
    return { error: error as AuthError };
  }
}

// Helper function to extract YouTube video ID
export function extractYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  
  // Handle already extracted video IDs (11 characters)
  if (url.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return url;
  }
  
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7] && match[7].length === 11) ? match[7] : null;
}

// Helper function to get YouTube thumbnail URL
export function getYouTubeThumbnailUrl(videoIdOrUrl: string): string {
  if (!videoIdOrUrl) return 'https://placehold.co/600x400?text=Invalid+YouTube+URL';
  
  // Check if input is a URL or a video ID
  const videoId = videoIdOrUrl.length === 11 ? 
    videoIdOrUrl : 
    extractYouTubeVideoId(videoIdOrUrl);
    
  if (!videoId) return 'https://placehold.co/600x400?text=Invalid+YouTube+URL';
  
  // Return the high-quality thumbnail
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

// Function to upload an image to Supabase storage
export async function uploadImage(file: File, bucket: string = 'video-images'): Promise<string | null> {
  try {
    // Create a unique filename
    const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    
    console.log(`Uploading file ${fileName} to bucket ${bucket}`);
    
    // Upload the file to Supabase storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file);
    
    if (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
    
    console.log('Upload successful:', data);
    
    // Return the path in bucket/filename format for consistent handling
    return `${bucket}/${fileName}`;
  } catch (error) {
    console.error('Error in uploadImage:', error);
    return null;
  }
}

// Function to get a signed URL for an image (works for private buckets)
export async function getSignedImageUrl(imagePath: string, expiresIn: number = 3600): Promise<string | null> {
  try {
    console.log('Getting signed URL for:', imagePath);
    
    // Check if it's already a full URL
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // Check if it's a YouTube video ID or URL
    if (extractYouTubeVideoId(imagePath)) {
      return getYouTubeThumbnailUrl(imagePath);
    }
    
    // Split path into bucket and file path if in format 'bucket/path'
    let bucketName = 'video-images';
    let filePath = imagePath;
    
    if (imagePath.includes('/')) {
      const parts = imagePath.split('/');
      bucketName = parts[0];
      filePath = parts.slice(1).join('/');
    }
    
    console.log(`Using bucket: ${bucketName}, file path: ${filePath}`);
    
    // Create a signed URL that works even for private buckets
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, expiresIn);
    
    if (error) {
      console.error('Error creating signed URL:', error);
      throw error;
    }
    
    console.log('Signed URL created successfully:', data.signedUrl);
    return data.signedUrl;
  } catch (error) {
    console.error('Error in getSignedImageUrl:', error);
    
    // Try fallback to direct URL
    try {
      let bucketName = 'video-images';
      let filePath = imagePath;
      
      if (imagePath.includes('/')) {
        const parts = imagePath.split('/');
        bucketName = parts[0];
        filePath = parts.slice(1).join('/');
      }
      
      console.log('Trying fallback with public URL');
      const { data } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);
      
      console.log('Public URL fallback:', data.publicUrl);
      return data.publicUrl;
    } catch (fallbackError) {
      console.error('Fallback to public URL also failed:', fallbackError);
      return null;
    }
  }
}

// Function to retrieve a public image URL (works only for public buckets)
export async function getImageUrl(imagePath: string): Promise<string | null> {
  try {
    console.log('Getting image URL for:', imagePath);
    
    // Check if it's already a full URL
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // Check if it's a YouTube video ID or URL
    if (extractYouTubeVideoId(imagePath)) {
      return getYouTubeThumbnailUrl(imagePath);
    }
    
    // Split path into bucket and file path if in format 'bucket/path'
    let bucketName = 'video-images';
    let filePath = imagePath;
    
    if (imagePath.includes('/')) {
      const parts = imagePath.split('/');
      bucketName = parts[0];
      filePath = parts.slice(1).join('/');
    }
    
    console.log(`Using bucket: ${bucketName}, file path: ${filePath}`);
    
    // Try signed URL first (works for both public and private buckets)
    const signedUrl = await getSignedImageUrl(`${bucketName}/${filePath}`);
    if (signedUrl) return signedUrl;
    
    // Fallback to public URL if signed URL fails
    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
      
    console.log('Public URL fallback:', data.publicUrl);
    return data.publicUrl;
  } catch (error) {
    console.error('Error in getImageUrl:', error);
    // Return a placeholder image if all attempts fail
    return 'https://placehold.co/600x400?text=Image+Not+Available';
  }
}

// Function to store image reference in the database
export async function storeImageReference(videoId: string, imageUrl: string): Promise<boolean> {
  try {
    console.log(`Storing image reference for video ${videoId}: ${imageUrl}`);
    
    const { error } = await supabase
      .from('image_references')
      .insert([
        { video_id: videoId, image_url: imageUrl }
      ]);
    
    if (error) {
      console.error('Error storing image reference:', error);
      return false;
    }
    
    console.log('Image reference stored successfully');
    return true;
  } catch (error) {
    console.error('Error in storeImageReference:', error);
    return false;
  }
}

// Function to get all image references for a video
export async function getImageReferences(videoId: string): Promise<string[]> {
  try {
    console.log(`Getting image references for video ${videoId}`);
    
    const { data, error } = await supabase
      .from('image_references')
      .select('image_url')
      .eq('video_id', videoId);
    
    if (error) {
      console.error('Error getting image references:', error);
      return [];
    }
    
    const imageUrls = data.map(item => item.image_url);
    console.log(`Found ${imageUrls.length} image references:`, imageUrls);
    return imageUrls;
  } catch (error) {
    console.error('Error in getImageReferences:', error);
    return [];
  }
}
