import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import FormData from "form-data";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' })); // Increase limit for base64 images

  // Facebook Post API Route
  app.post("/api/facebook-post", async (req, res) => {
    const { message, mediaUrl, scheduleTime, mediaUrls } = req.body;
    
    const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    const PAGE_ID = process.env.FACEBOOK_PAGE_ID;

    if (!PAGE_ACCESS_TOKEN || !PAGE_ID) {
      return res.status(500).json({ 
        success: false, 
        error: "Facebook credentials (FACEBOOK_PAGE_ACCESS_TOKEN and FACEBOOK_PAGE_ID) are not configured on the server." 
      });
    }

    try {
      const allMedia = mediaUrls && Array.isArray(mediaUrls) ? mediaUrls : (mediaUrl ? [mediaUrl] : []);

      // If we have multiple images, use the multi-photo upload flow
      if (allMedia.length > 1) {
        console.log(`Processing ${allMedia.length} images for multi-photo post`);
        
        // 1. Upload all photos as unpublished
        const mediaIds = await Promise.all(allMedia.map(async (url, idx) => {
          const isBase64 = url.startsWith('data:');
          let endpoint = `https://graph.facebook.com/v19.0/${PAGE_ID}/photos`;
          
          if (isBase64) {
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
            const response = await axios.post(endpoint, {
              access_token: PAGE_ACCESS_TOKEN,
              url: url,
              published: 'false'
            });
            return response.data.id;
          }
        }));

        // 2. Create a feed post with attached media
        const endpoint = `https://graph.facebook.com/v19.0/${PAGE_ID}/feed`;
        const attached_media = mediaIds.map(id => ({ media_fbid: id }));
        
        const params: any = {
          access_token: PAGE_ACCESS_TOKEN,
          message: message || '',
          attached_media: JSON.stringify(attached_media)
        };

        if (scheduleTime) {
          const scheduledTimestamp = Math.floor(new Date(scheduleTime).getTime() / 1000);
          params.published = false;
          params.scheduled_publish_time = scheduledTimestamp;
        }

        const response = await axios.post(endpoint, params);
        return res.json({ 
          success: true, 
          postId: response.data.id || response.data.post_id 
        });
      }

      // Single item or text-only logic
      let endpoint = `https://graph.facebook.com/v19.0/${PAGE_ID}/`;
      const currentMediaUrl = allMedia[0];
      
      if (currentMediaUrl && currentMediaUrl.startsWith('data:')) {
        endpoint += "photos";
        const [header, base64Data] = currentMediaUrl.split(',');
        const buffer = Buffer.from(base64Data, 'base64');
        const mimeType = header.split(';')[0].split(':')[1] || 'image/jpeg';

        const form = new FormData();
        form.append('access_token', PAGE_ACCESS_TOKEN);
        form.append('source', buffer, { filename: `photo.jpg`, contentType: mimeType });
        form.append('caption', message || '');

        if (scheduleTime) {
          const scheduledTimestamp = Math.floor(new Date(scheduleTime).getTime() / 1000);
          form.append('published', 'false');
          form.append('scheduled_publish_time', scheduledTimestamp.toString());
        }

        const response = await axios.post(endpoint, form, { headers: form.getHeaders() });
        return res.json({ success: true, postId: response.data.id || response.data.post_id });
      }

      // Handle standard message or external image URL
      const params: any = {
        access_token: PAGE_ACCESS_TOKEN,
      };

      if (scheduleTime) {
        const scheduledTimestamp = Math.floor(new Date(scheduleTime).getTime() / 1000);
        params.published = false;
        params.scheduled_publish_time = scheduledTimestamp;
      }

      if (currentMediaUrl) {
        endpoint += "photos";
        params.url = currentMediaUrl;
        params.caption = message;
      } else {
        endpoint += "feed";
        params.message = message;
      }

      const response = await axios.post(endpoint, params);
      return res.json({ success: true, postId: response.data.id || response.data.post_id });
    } catch (error: any) {
      const errorData = error.response?.data?.error || {};
      console.error("Facebook API Error:", JSON.stringify(errorData, null, 2));
      
      let friendlyMessage = "Failed to post to Facebook";
      
      if (errorData.type === 'OAuthException') {
        friendlyMessage = `Facebook Authentication Error: ${errorData.message || "Invalid or expired token"}. Please check your FACEBOOK_PAGE_ACCESS_TOKEN and FACEBOOK_PAGE_ID.`;
      } else if (errorData.message) {
        friendlyMessage = errorData.message;
      }

      res.status(error.response?.status || 500).json({ 
        success: false, 
        error: friendlyMessage,
        details: errorData // Send back details for debugging if needed
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  
  return { app, server };
}

const serverPromise = startServer();
export default (await serverPromise).app;
