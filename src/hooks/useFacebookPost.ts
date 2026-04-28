import { useState } from 'react';

interface FacebookPostData {
  message: string;
  mediaUrl?: string;
  mediaUrls?: string[];
  scheduleTime?: string;
}

interface FacebookPostResponse {
  success: boolean;
  postId?: string;
  error?: string;
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
        setError(result.error || 'Failed to post to Facebook');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
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
    isLoading,
    error,
    success,
    postId,
    resetStatus
  };
}
