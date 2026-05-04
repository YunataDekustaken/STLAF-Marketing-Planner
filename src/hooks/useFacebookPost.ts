import { useState } from 'react';

interface FacebookPostData {
  message: string;
  mediaUrl?: string;
  mediaUrls?: string[];
  scheduleTime?: string | number;
}

interface FacebookPostResponse {
  success: boolean;
  postId?: string;
  error?: string;
  fbError?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
  };
}


export function useFacebookPost() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [postId, setPostId] = useState<string | null>(null);

  const postToFacebook = async (data: FacebookPostData) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    setPostId(null);

    try {
      const response = await fetch('/api/facebook-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result: FacebookPostResponse = await response.json();

      if (result.success) {
        setSuccess(true);
        setPostId(result.postId || null);
      } else {
        const detail = result.fbError ? ` (${result.fbError.type}: ${result.fbError.message})` : '';
        setError((result.error || 'Failed to post to Facebook') + detail);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteFacebookPost = async (fbPostId: string) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/facebook-post/${fbPostId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setSuccess(true);
        return true;
      } else {
        setError(result.error || 'Failed to delete post from Facebook');
        return false;
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const resetStatus = () => {
    setIsLoading(false);
    setError(null);
    setSuccess(false);
    setPostId(null);
  };

  return {
    postToFacebook,
    deleteFacebookPost,
    isLoading,
    error,
    success,
    postId,
    resetStatus
  };
}
