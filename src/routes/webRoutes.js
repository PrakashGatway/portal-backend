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
  toggleArticleStatus,
  logReadTime
} from '../controllers//Websites/blogController.js';
import { Lead } from '../models/Leads.js';


import {
  createComment,
  getArticleComments,
  getAllComments,
  approveComment,
  rejectComment,
  deleteComment,
  reportComment,
  likeComment,
  dislikeComment,
  getCommentStats
} from '../controllers/Websites/commentsControllers.js';
import { protect } from '../middleware/auth.js';
import axios from 'axios';


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
router.post('/blog/log/:id', logReadTime);
router.delete('/blog/:id', deleteArticle);
router.patch('/blog/:id/status', toggleArticleStatus);

router.get('/comments/:articleId', getArticleComments);
router.post('/comments/create', protect, createComment);
router.post('/:commentId/like', protect, likeComment);
router.post('/:commentId/dislike', protect, dislikeComment);
router.post('/:commentId/report', protect, reportComment);

// Admin routes
router.get('/comments', protect, getAllComments);
router.put('/:commentId/approve', protect, approveComment);
router.put('/:commentId/reject', protect, rejectComment);
router.delete('/:commentId', protect, deleteComment);
router.get('/stats', protect, getCommentStats);

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
  if (req.body.entry) {
    for (const entry of req.body.entry) {
      for (const change of entry.changes || []) {
        if (change.field === "leadgen") {
          const leadId = change.value.leadgen_id;
          const formId = change.value.form_id;
          const pageId = change.value.page_id;
          const token = "EAA8w7TGqzLwBQfRmsh3U0Cdm31wRic9YmNU7L5qXRoJKCBspZBheUjcxr93BPMvtZCmA4gkNvY6gEZCA9nsbCnaysBBATSJblbH87N7tF64FQliJJzUTnfIZANBk4sMBPxSYKQZAb1hno4DyPTXGcb2bHDiiAFBQSFuVZASEfmPBzLL7ZADh7stIdVeVShg1OW6pZBPQSrAZD"

          try {
            const response = await fetch(
              `https://graph.facebook.com/v19.0/${leadId}?access_token=${token}`
            );
            const leadData = await response.json();

            const formattedData = Object.fromEntries(
              leadData.field_data?.map(f => [f.name, f.values[0]])
            );

            const { full_name, email, phone_number, phone, city, ...extraDetails } = formattedData;

            await Lead.create({
              fullName: full_name,
              email,
              phone: phone_number || phone,
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

// getLongLivedPageTokenSimple(4275919949319356,"979cfdbbb1418fb29c2a25c122d06668","EAA8w7TGqzLwBQdRwAJgRwTZAljeuE2sPGYkr0pFcvAAGw7FjgT3nTSh0w84jojc2CNdws4J9mHu1umgllU8NuoWkZBXZCxastgP0Viz0XxcWv0gcRVQc1xZCFjrkXzuGg229UFZBRpK5uhY7WmVoYr302XoZBaltIDu9xPqYnyV6L3UZArUzquFTGnZAHTE3sYSSXXh8aA03YWwZCgpciIaWje1RJk6ZCTVAFXC3RlDQ2M5Xx3CdHNLZA2d9vMgCIEnZCNpQNimOGZAZAvwQeSC3HNOcBO",221710514363587)

async function getLongLivedPageTokenSimple(appId, appSecret, userToken, pageId) {
  const baseURL = 'https://graph.facebook.com/v24.0';
  try {
    const longUserToken = await axios.get(
      `${baseURL}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${userToken}`
    );
    const pageToken = await axios.get(
      `${baseURL}/${pageId}?fields=access_token,name&access_token=${longUserToken.data.access_token}`
    );

    // pageid ="221710514363587"

    console.log({
      pageAccessToken: pageToken.data.access_token,
      pageName: pageToken.data.name,
      expiresIn: '60 days'
    })
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