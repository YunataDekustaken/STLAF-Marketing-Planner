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

    if (allMedia.length > 1) {
      const mediaIds = await Promise.all(allMedia.map(async (url, idx) => {
        const endpoint = `https://graph.facebook.com/v19.0/${PAGE_ID}/photos`;
        if (url.startsWith('data:')) {
          const [header, base64Data] = url.split(',');
          const buffer = Buffer.from(base64Data, 'base64');
          const mimeType = header.split(';')[0].split(':')[1] || 'image/jpeg';
          const form = new FormData();
          form.append('access_token', PAGE_ACCESS_TOKEN);
          form.append('source', buffer, { filename: `image_${idx}.jpg`, contentType: mimeType });
          form.append('published', 'false');
          const response = await axios.post(endpoint, form, { headers: form.getHeaders() });
          return response.data.id;
        } else {
          const response = await axios.post(endpoint, { access_token: PAGE_ACCESS_TOKEN, url, published: 'false' });
          return response.data.id;
        }
      }));

      const params = {
        access_token: PAGE_ACCESS_TOKEN,
        message: message || '',
        attached_media: JSON.stringify(mediaIds.map(id => ({ media_fbid: id })))
      };
      if (scheduleTime) {
        params.published = false;
        params.scheduled_publish_time = Math.floor(new Date(scheduleTime).getTime() / 1000);
      }
      const response = await axios.post(`https://graph.facebook.com/v19.0/${PAGE_ID}/feed`, params);
      return res.json({ success: true, postId: response.data.id });
    }

    const currentMedia = allMedia[0];
    let endpoint = `https://graph.facebook.com/v19.0/${PAGE_ID}/`;
    const params = { access_token: PAGE_ACCESS_TOKEN };

    if (scheduleTime) {
      params.published = false;
      params.scheduled_publish_time = Math.floor(new Date(scheduleTime).getTime() / 1000);
    }

    if (currentMedia?.startsWith('data:')) {
      endpoint += 'photos';
      const [header, base64Data] = currentMedia.split(',');
      const buffer = Buffer.from(base64Data, 'base64');
      const mimeType = header.split(';')[0].split(':')[1] || 'image/jpeg';
      const form = new FormData();
      form.append('access_token', PAGE_ACCESS_TOKEN);
      form.append('source', buffer, { filename: 'photo.jpg', contentType: mimeType });
      form.append('caption', message || '');
      if (scheduleTime) {
        form.append('published', 'false');
        form.append('scheduled_publish_time', params.scheduled_publish_time.toString());
      }
      const response = await axios.post(endpoint, form, { headers: form.getHeaders() });
      return res.json({ success: true, postId: response.data.id });
    } else if (currentMedia) {
      endpoint += 'photos';
      params.url = currentMedia;
      params.caption = message;
    } else {
      endpoint += 'feed';
      params.message = message;
    }

    const response = await axios.post(endpoint, params);
    return res.json({ success: true, postId: response.data.id });

  } catch (error) {
    const errorData = error.response?.data?.error || {};
    console.error("Facebook API Error:", errorData);
    return res.status(error.response?.status || 500).json({ 
      success: false, 
      error: errorData.message || 'Failed to post to Facebook'
    });
  }
}