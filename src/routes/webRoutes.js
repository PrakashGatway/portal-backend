import { Router } from 'express';
import {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/Websites/blogCategories.js';


import {
  getArticles,
  getArticle,
  createArticle,
  updateArticle,
  deleteArticle,
  toggleArticleStatus
} from '../controllers//Websites/blogController.js';
import { Lead } from '../models/Leads.js';

const router = Router();

router.route('/cat')
  .get(getCategories)
  .post(createCategory);

router.route('/cat/:id')
  .get(getCategory)
  .put(updateCategory)
  .delete(deleteCategory);

router.get('/blog', getArticles);
router.get('/blog/:slug', getArticle);

router.post('/blog/', createArticle);
router.put('/blog/:id', updateArticle);
router.delete('/blog/:id', deleteArticle);
router.patch('/blog/:id/status', toggleArticleStatus);

router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === "leadsfromwebhook") {
    console.log("✅ Webhook verified successfully!");
    res.status(200).send(challenge);
  } else {
    console.log("❌ Webhook verification failed!");
    res.sendStatus(403);
  }
});

router.post("/webhook", async (req, res) => {
  console.log("📩 Webhook POST body:", JSON.stringify(req.body, null, 2));
  if (req.body.entry) {
    for (const entry of req.body.entry) {
      for (const change of entry.changes || []) {
        if (change.field === "leadgen") {
          const leadId = change.value.leadgen_id;
          const formId = change.value.form_id;
          const pageId = change.value.page_id;

          try {
            const response = await fetch(
              `https://graph.facebook.com/v19.0/${leadId}?access_token=EAA8w7TGqzLwBP552Pjvw5WTgSXCzD5ZC7ZB9FwAfIE1itluz0p7WihCan0QQopBiiZArN8n8Tuh7ak9833TEY6JVT1NVnDbrYf3joM0k5XGZB7iEMwpKmhpcCGrz8sVlZAZBMkrhbNbZCvBYHLzgu3h70aksxFiMjLZCuA8AvWhWaUG72HpgGkKofgWWikLxDUlzlqaZABiNr7AIv85oG`
            );
            const leadData = await response.json();

            const formattedData = Object.fromEntries(
              leadData.field_data.map(f => [f.name, f.values[0]])
            );

            const { full_name, email, phone_number, city, ...extraDetails } = formattedData;

            await Lead.create({
              fullName: full_name,
              email,
              phone: phone_number,
              city,
              coursePreference: 'unfilled',
              source: 'metaAds',
              extraDetails,
            });

          } catch (error) {
            console.error("❌ Error fetching lead:", error);
          }
        }
      }
    }
  }
  res.status(200).send("EVENT_RECEIVED");
});

async function getLongLivedPageTokenSimple(appId, appSecret, userToken, pageId) {
  const baseURL = 'https://graph.facebook.com/v24.0';
  try {
    const longUserToken = await axios.get(
      `${baseURL}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${userToken}`
    );
    const pageToken = await axios.get(
      `${baseURL}/${pageId}?fields=access_token,name&access_token=${longUserToken.data.access_token}`
    );
    return {
      pageAccessToken: pageToken.data.access_token,
      pageName: pageToken.data.name,
      expiresIn: '60 days'
    };
  } catch (error) {
    throw new Error(error.response?.data?.error?.message || error.message);
  }
}


export default router;