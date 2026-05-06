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

  // In-memory store for temporary public images to serve to Instagram Graph API
  const tempMediaStore = new Map<string, { buffer: Buffer, mimeType: string }>();

  app.get("/public-media/:id", (req, res) => {
    const media = tempMediaStore.get(req.params.id);
    if (!media) {
      return res.status(404).send('Not found');
    }
    res.setHeader('Content-Type', media.mimeType);
    res.send(media.buffer);
  });

  // Instagram Post API Route
  app.post("/api/instagram-post", async (req, res) => {
    const { message, mediaUrls } = req.body;
    
    const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    const PAGE_ID = process.env.FACEBOOK_PAGE_ID;

    if (!PAGE_ACCESS_TOKEN || !PAGE_ID) {
      return res.status(500).json({ 
        success: false, 
        error: "Facebook credentials (FACEBOOK_PAGE_ACCESS_TOKEN and FACEBOOK_PAGE_ID) are not configured on the server." 
      });
    }

    if (!mediaUrls || mediaUrls.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Instagram requires at least one image or video."
      });
    }

    try {
      // Get Instagram Business Account ID
      const infoRes = await axios.get(`https://graph.facebook.com/v19.0/${PAGE_ID}`, {
        params: {
          fields: 'instagram_business_account',
          access_token: PAGE_ACCESS_TOKEN
        }
      });
      
      const igAccountId = infoRes.data?.instagram_business_account?.id;
      if (!igAccountId) {
        throw new Error("No Instagram Business account linked to this Facebook Page.");
      }

      const isCarousel = mediaUrls.length > 1;
      let containerIds: string[] = [];

      for (let i = 0; i < mediaUrls.length; i++) {
        let currentMediaUrl = mediaUrls[i];
        let mediaIdForCleanup: string | null = null;
        
        if (currentMediaUrl.startsWith('data:')) {
          const [header, base64Data] = currentMediaUrl.split(',');
          const buffer = Buffer.from(base64Data, 'base64');
          const mimeType = header.split(';')[0].split(':')[1] || 'image/jpeg';
          
          mediaIdForCleanup = Date.now().toString() + Math.random().toString().slice(2);
          tempMediaStore.set(mediaIdForCleanup, { buffer, mimeType });
          
          // Use the request host to construct a public URL
          // If running behind a proxy (like Cloud Run), x-forwarded-host gives the public domain
          const host = req.headers['x-forwarded-host'] || req.get('host');
          const protocol = req.headers['x-forwarded-proto'] || 'https'; // Assuming HTTPS in production
          currentMediaUrl = `${protocol}://${host}/public-media/${mediaIdForCleanup}`;
        }

        // Create Media Container
        const containerParams: any = {
          image_url: currentMediaUrl,
          access_token: PAGE_ACCESS_TOKEN,
        };
        
        if (!isCarousel && i === 0) {
          containerParams.caption = message || '';
        } else if (isCarousel) {
          containerParams.is_carousel_item = true;
        }

        const containerRes = await axios.post(`https://graph.facebook.com/v19.0/${igAccountId}/media`, containerParams);
        containerIds.push(containerRes.data.id);

        if (mediaIdForCleanup) {
          // Keep it available for a minute to give FB servers time to download it
          setTimeout(() => {
            tempMediaStore.delete(mediaIdForCleanup!);
          }, 60000);
        }
      }

      let finalCreationId = containerIds[0];

      if (isCarousel) {
        // Create a carousel container
        const carouselRes = await axios.post(`https://graph.facebook.com/v19.0/${igAccountId}/media`, {
          media_type: 'CAROUSEL',
          children: containerIds.join(','),
          caption: message || '',
          access_token: PAGE_ACCESS_TOKEN
        });
        finalCreationId = carouselRes.data.id;
      }

      // Wait a moment for Instagram to finish processing the container(s)
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Publish the Media Container
      const publishRes = await axios.post(`https://graph.facebook.com/v19.0/${igAccountId}/media_publish`, {
        creation_id: finalCreationId,
        access_token: PAGE_ACCESS_TOKEN
      });

      return res.json({ 
        success: true, 
        postId: publishRes.data.id
      });
      
    } catch (error: any) {
      const errorData = error.response?.data?.error || {};
      console.error("Instagram API Error:", JSON.stringify(errorData, null, 2));
      
      let friendlyMessage = "Failed to post to Instagram";
      if (errorData.message) {
        friendlyMessage = errorData.message;
      }

      return res.status(error.response?.status || 500).json({ 
        success: false, 
        error: friendlyMessage,
        details: errorData 
      });
    }
  });

  // Meta Post API Route (Facebook & Instagram)
  app.post("/api/meta-post", async (req, res) => {
    const { message, mediaUrl, scheduleTime, mediaUrls, platforms } = req.body;
    
    // platforms should be an array like ['facebook', 'instagram']
    const targetPlatforms = Array.isArray(platforms) ? platforms : ['facebook'];
    
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

      let igUserId: string | null = null;
      if (targetPlatforms.includes('instagram')) {
        // Fetch IG user ID
        const pageInfoResponse = await axios.get(`https://graph.facebook.com/v19.0/${PAGE_ID}`, {
          params: { fields: 'instagram_business_account', access_token: PAGE_ACCESS_TOKEN }
        });
        if (pageInfoResponse.data.instagram_business_account) {
          igUserId = pageInfoResponse.data.instagram_business_account.id;
        } else {
          return res.status(400).json({ success: false, error: "No Instagram Business Account linked to this Facebook Page." });
        }
      }

      const results: { facebook?: string, instagram?: string } = {};

      // 1. Upload all media to Facebook (unpublished) first to get public URLs
      const uploadedMedia = await Promise.all(allMedia.map(async (url, idx) => {
        const isBase64 = url.startsWith('data:');
        let endpoint = `https://graph.facebook.com/v19.0/${PAGE_ID}/photos`;
        let fbPhotoId: string;
        
        if (isBase64) {
          const [header, base64Data] = url.split(',');
          const buffer = Buffer.from(base64Data, 'base64');
          const mimeType = header.split(';')[0].split(':')[1] || 'image/jpeg';
          
          const form = new FormData();
          form.append('access_token', PAGE_ACCESS_TOKEN);
          form.append('source', buffer, { filename: `image_${idx}.jpg`, contentType: mimeType });
          form.append('published', 'false');
          
          const response = await axios.post(endpoint, form, { headers: form.getHeaders() });
          fbPhotoId = response.data.id;
        } else {
          const response = await axios.post(endpoint, {
            access_token: PAGE_ACCESS_TOKEN,
            url: url,
            published: 'false'
          });
          fbPhotoId = response.data.id;
        }

        // Get public URL of the uploaded image
        const photoDetails = await axios.get(`https://graph.facebook.com/v19.0/${fbPhotoId}`, {
          params: { fields: 'images', access_token: PAGE_ACCESS_TOKEN }
        });
        // Facebook returns an array of images of different sizes. first is the largest.
        const publicUrl = photoDetails.data.images[0]?.source;

        return { fbPhotoId, publicUrl };
      }));

      // 2. Post to Facebook
      if (targetPlatforms.includes('facebook')) {
        let endpoint = `https://graph.facebook.com/v19.0/${PAGE_ID}/feed`;
        const params: any = {
          access_token: PAGE_ACCESS_TOKEN,
          message: message || '',
        };

        if (scheduleTime) {
          const scheduledTimestamp = Math.floor(new Date(scheduleTime).getTime() / 1000);
          params.published = false;
          params.scheduled_publish_time = scheduledTimestamp;
        }

        if (uploadedMedia.length > 0) {
          const attached_media = uploadedMedia.map(media => ({ media_fbid: media.fbPhotoId }));
          params.attached_media = JSON.stringify(attached_media);
        }

        const response = await axios.post(endpoint, params);
        results.facebook = response.data.id || response.data.post_id;
      }

      // 3. Post to Instagram
      if (targetPlatforms.includes('instagram') && igUserId) {
         if (scheduleTime) {
             throw new Error("Instagram Graph API currently does not support direct scheduling through this endpoint.");
         }

         if (uploadedMedia.length === 0) {
             throw new Error("Instagram requires at least one image or video.");
         }

         if (uploadedMedia.length === 1) {
             // Single image post
             const creationResponse = await axios.post(`https://graph.facebook.com/v19.0/${igUserId}/media`, null, {
                 params: {
                     image_url: uploadedMedia[0].publicUrl,
                     caption: message || '',
                     access_token: PAGE_ACCESS_TOKEN
                 }
             });
             const creationId = creationResponse.data.id;

             // Publish
             const publishResponse = await axios.post(`https://graph.facebook.com/v19.0/${igUserId}/media_publish`, null, {
                 params: {
                     creation_id: creationId,
                     access_token: PAGE_ACCESS_TOKEN
                 }
             });
             results.instagram = publishResponse.data.id;
         } else {
             // Carousel post
             const carouselItemIds = await Promise.all(uploadedMedia.map(async (media) => {
                  const itemResponse = await axios.post(`https://graph.facebook.com/v19.0/${igUserId}/media`, null, {
                      params: {
                          image_url: media.publicUrl,
                          is_carousel_item: 'true',
                          access_token: PAGE_ACCESS_TOKEN
                      }
                  });
                  return itemResponse.data.id;
             }));

             const carouselCreateResponse = await axios.post(`https://graph.facebook.com/v19.0/${igUserId}/media`, null, {
                 params: {
                     media_type: 'CAROUSEL',
                     children: carouselItemIds.join(','),
                     caption: message || '',
                     access_token: PAGE_ACCESS_TOKEN
                 }
             });
             const carouselCreationId = carouselCreateResponse.data.id;

             const publishResponse = await axios.post(`https://graph.facebook.com/v19.0/${igUserId}/media_publish`, null, {
                 params: {
                     creation_id: carouselCreationId,
                     access_token: PAGE_ACCESS_TOKEN
                 }
             });
             results.instagram = publishResponse.data.id;
         }
      }

      return res.json({ 
        success: true, 
        results 
      });

    } catch (error: any) {
      const errorData = error.response?.data?.error || error.response?.data || {};
      console.error("Meta API Error:", JSON.stringify(errorData, null, 2));
      
      let friendlyMessage = "Failed to post to Meta properties";
      
      if (errorData.type === 'OAuthException') {
        friendlyMessage = `Meta Authentication Error: ${errorData.message || "Invalid or expired token"}. Please check your FACEBOOK_PAGE_ACCESS_TOKEN and FACEBOOK_PAGE_ID.`;
      } else if (errorData.message) {
        friendlyMessage = errorData.message;
      } else if (error.message) {
        friendlyMessage = error.message;
      }

      res.status(error.response?.status || 500).json({ 
        success: false, 
        error: friendlyMessage,
        details: errorData
      });
    }
  });

  // Delete Facebook Post API Route
  app.delete("/api/facebook-post/:postId", async (req, res) => {
    const { postId } = req.params;
    const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

    if (!PAGE_ACCESS_TOKEN) {
      return res.status(500).json({ 
        success: false, 
        error: "Facebook credentials (FACEBOOK_PAGE_ACCESS_TOKEN) are not configured on the server." 
      });
    }

    try {
      const endpoint = `https://graph.facebook.com/v19.0/${postId}`;
      await axios.delete(endpoint, {
        params: {
          access_token: PAGE_ACCESS_TOKEN
        }
      });
      
      return res.json({ success: true });
    } catch (error: any) {
      const errorData = error.response?.data?.error || {};
      console.error("Facebook API Delete Error:", JSON.stringify(errorData, null, 2));
      
      res.status(error.response?.status || 500).json({ 
        success: false, 
        error: errorData.message || "Failed to delete post from Facebook"
      });
    }
  });

  // Fetch Facebook Page Info API Route
  app.get("/api/facebook-page-info", async (req, res) => {
    const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    const PAGE_ID = process.env.FACEBOOK_PAGE_ID;

    if (!PAGE_ACCESS_TOKEN || !PAGE_ID) {
      return res.status(200).json({ 
        success: false, 
        error: "Facebook credentials not configured." 
      });
    }

    try {
      const endpoint = `https://graph.facebook.com/v19.0/${PAGE_ID}`;
      const response = await axios.get(endpoint, {
        params: {
          fields: 'name,link,picture,about,instagram_business_account{id,username,name,profile_picture_url}',
          access_token: PAGE_ACCESS_TOKEN
        }
      });
      
      return res.json({ 
        success: true, 
        pageInfo: response.data 
      });
    } catch (error: any) {
      const errorData = error.response?.data?.error || {};
      console.error("Facebook API Page Info Error:", JSON.stringify(errorData, null, 2));
      
      res.status(error.response?.status || 500).json({ 
        success: false, 
        error: errorData.message || "Failed to fetch Facebook Page info"
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
