import axios from 'axios';
import FormData from 'form-data';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, mediaUrl, scheduleTime, mediaUrls } = req.body;
  const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const PAGE_ID = process.env.FACEBOOK_PAGE_ID;

  if (!PAGE_ACCESS_TOKEN || !PAGE_ID) {
    return res.status(500).json({ 
      success: false, 
      error: "Facebook credentials not configured." 
    });
  }

  try {
    const allMedia = Array.isArray(mediaUrls) && mediaUrls.length > 0 
      ? mediaUrls 
      : (mediaUrl ? [mediaUrl] : []);

    // 1. Prepare common parameters
    const PAGE_TOKEN = PAGE_ACCESS_TOKEN.trim();
    const PAGE = PAGE_ID.trim();

    // 2. Upload media as unpublished photos first
    const mediaIds = await Promise.all(allMedia.map(async (url, idx) => {
      const photoEndpoint = `https://graph.facebook.com/v19.0/${PAGE}/photos`;
      if (url.startsWith('data:')) {
        const [header, base64Data] = url.split(',');
        const buffer = Buffer.from(base64Data, 'base64');
        const mimeType = header.split(';')[0].split(':')[1] || 'image/jpeg';
        const form = new FormData();
        form.append('access_token', PAGE_TOKEN);
        form.append('source', buffer, { filename: `image_${idx}.jpg`, contentType: mimeType });
        form.append('published', 'false');
        const response = await axios.post(photoEndpoint, form, { headers: form.getHeaders() });
        return response.data.id;
      } else {
        const params = new URLSearchParams();
        params.append('access_token', PAGE_TOKEN);
        params.append('url', url);
        params.append('published', 'false');
        const response = await axios.post(photoEndpoint, params.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        return response.data.id;
      }
    }));

    // 3. Finalization logic: Single Photo vs Multi Photo vs Text Only
    let endpoint = `https://graph.facebook.com/v19.0/${PAGE}/`;
    const finalParams = new URLSearchParams();
    finalParams.append('access_token', PAGE_TOKEN);

    if (mediaIds.length === 1) {
      // Single photo flow - use /photos for better reliability
      endpoint += 'photos';
      finalParams.append('photo_id', mediaIds[0]); // Actually for posting existing photo to feed, we use /feed or set published: true.
      // But for single photo with message, we can just edit the unpublished photo to publish it? 
      // Actually, standard practice for single photo is the feed endpoint with attached_media too,
      // OR post directly to /photos with published: true.
      // Let's use /feed for consistency across 1+ images.
      endpoint += 'feed';
      finalParams.append('message', message || '');
      finalParams.append('attached_media', JSON.stringify([{ media_fbid: mediaIds[0] }]));
    } else if (mediaIds.length > 1) {
      // Multi photo flow
      endpoint += 'feed';
      finalParams.append('message', message || '');
      finalParams.append('attached_media', JSON.stringify(mediaIds.map(id => ({ media_fbid: id }))));
    } else {
      // Text only flow
      endpoint += 'feed';
      finalParams.append('message', message || '');
    }

    if (scheduleTime) {
      finalParams.append('published', 'false');
      const unixTime = typeof scheduleTime === 'number' 
        ? scheduleTime 
        : Math.floor(new Date(scheduleTime).getTime() / 1000);
      finalParams.append('scheduled_publish_time', unixTime.toString());
    }

    // Remove the redundant part of the endpoint if it was doubled
    const cleanEndpoint = endpoint.replace(/\/\/+/, '/').replace('https:/', 'https://');

    const response = await axios.post(cleanEndpoint, finalParams.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    return res.json({ success: true, postId: response.data.id });

  } catch (error) {
    const errorData = error.response?.data?.error || { message: error.message };
    console.error("Facebook API Error Detailed:", JSON.stringify(errorData, null, 2));
    
    return res.status(error.response?.status || 500).json({ 
      success: false, 
      error: errorData.message || 'Failed to post to Facebook',
      fbError: errorData
    });
  }
}