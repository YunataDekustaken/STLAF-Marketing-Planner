import axios from 'axios';

/**
 * Vercel Serverless Function
 * Handles: DELETE /api/facebook-post/[postId]
 *
 * Place this file at:  api/facebook-post/[postId].js
 */
export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { postId } = req.query;
  const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

  if (!PAGE_ACCESS_TOKEN) {
    return res.status(500).json({
      success: false,
      error: 'Facebook credentials (FACEBOOK_PAGE_ACCESS_TOKEN) are not configured.',
    });
  }

  if (!postId) {
    return res.status(400).json({ success: false, error: 'Missing postId.' });
  }

  try {
    await axios.delete(`https://graph.facebook.com/v19.0/${postId}`, {
      params: { access_token: PAGE_ACCESS_TOKEN.trim() },
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    const errorData = error.response?.data?.error || { message: error.message };
    console.error('Facebook DELETE Error:', JSON.stringify(errorData, null, 2));
    return res.status(error.response?.status || 500).json({
      success: false,
      error: errorData.message || 'Failed to delete post from Facebook',
      fbError: errorData,
    });
  }
}