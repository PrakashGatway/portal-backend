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
  axios.post('https://server.gatewayabroadeducations.com/api/metaleads', {
    ...req.body
  });

  if (req.body.entry) {
    for (const entry of req.body.entry) {
      for (const change of entry.changes || []) {
        if (change.field === "leadgen") {
          const leadId = change.value.leadgen_id;
          const formId = change.value.form_id;
          const pageId = change.value.page_id;
          const token = "EAA8w7TGqzLwBQfRmsh3U0Cdm31wRic9YmNU7L5qXRoJKCBspZBheUjcxr93BPMvtZCmA4gkNvY6gEZCA9nsbCnaysBBATSJblbH87N7tF64FQliJJzUTnfIZANBk4sMBPxSYKQZAb1hno4DyPTXGcb2bHDiiAFBQSFuVZASEfmPBzLL7ZADh7stIdVeVShg1OW6pZBPQSrAZD"

          // `https://graph.facebook.com/v19.0/${leadId}?access_token=${token}`

          try {
            const response = await fetch(
              `https://graph.facebook.com/v19.0/${leadId}?fields=id,created_time,ad_id,ad_name,adset_id,adset_name,campaign_id,custom_disclaimer_responses,field_data,form_id&access_token=${token}`
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
              adsDetails: {
                formId,
                campaign_id: leadData.campaign_id,
                leadId,
                ad_name: leadData.ad_name
              },
              extraDetails
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


const getAllLeadsAndInsert = async () => {
  const token = "EAA8w7TGqzLwBQfRmsh3U0Cdm31wRic9YmNU7L5qXRoJKCBspZBheUjcxr93BPMvtZCmA4gkNvY6gEZCA9nsbCnaysBBATSJblbH87N7tF64FQliJJzUTnfIZANBk4sMBPxSYKQZAb1hno4DyPTXGcb2bHDiiAFBQSFuVZASEfmPBzLL7ZADh7stIdVeVShg1OW6pZBPQSrAZD"
  const pageId = "221710514363587";

  // ✅ IST → UTC range
  const startDate = new Date("2026-03-18T18:30:00.000Z"); // 19 March IST start
  const endDate = new Date("2026-03-19T18:29:59.999Z"); // 19 March IST end

  let formUrl = `https://graph.facebook.com/v19.0/${pageId}/leadgen_forms?limit=100&access_token=${token}`;
  let forms = [];

  // ✅ Step 1: Get all forms
  while (formUrl) {
    const res = await fetch(formUrl);
    const data = await res.json();

    if (data.data) forms.push(...data.data);
    formUrl = data.paging?.next || null;
  }

  console.log("Total Forms:", forms.length);

  // ✅ Step 2: Loop forms → leads
  for (const form of forms) {
    let nextUrl = `https://graph.facebook.com/v19.0/${form.id}/leads?fields=id,created_time,field_data,ad_name,campaign_id&limit=100&access_token=${token}`;

    while (nextUrl) {
      const res = await fetch(nextUrl);
      const data = await res.json();

      if (data.data) {
        for (const lead of data.data) {
          // console.log("✅ Lead:", lead);

          const createdTime = new Date(lead.created_time);

          // ✅ Filter by IST (converted to UTC)
          if (createdTime < startDate || createdTime > endDate) continue;

          // ✅ Prevent duplicate (by leadId)


          // ✅ Convert field_data
          const formattedData = Object.fromEntries(
            lead.field_data?.map(f => [f.name, f.values[0]])
          );

          const { full_name, email, phone_number, phone, city, ...extraDetails } = formattedData;

          const phoneFinal = phone_number || phone;

          const phone10 = String(phoneFinal)
            .replace(/\D/g, "")   // remove non-digits
            .slice(-10);         // last 10 digits

          const exists = await Lead.findOne({
            phone: { $regex: `${phone10}$` } // ends with these 10 digits
          })

          if (exists) {
            console.log("⚠️ Duplicate skipped:", exists.phone);
            continue;
          }

          // console.log({
          //   fullName: full_name,
          //   email,
          //   phone: phone_number || phone,
          //   city,
          //   coursePreference: "unfilled",
          //   source: "metaAds",
          //   adsDetails: {
          //     formId: form.id,
          //     campaign_id: lead.campaign_id,
          //     leadId: lead.id,
          //     ad_name: lead.ad_name
          //   },
          //   extraDetails,
          //   createdAt: createdTime // ✅ keep original time
          // })

          // ✅ Insert like webhook
          const newLead = await Lead.create({
            fullName: full_name,
            email,
            phone: phone_number || phone,
            city,
            coursePreference: "unfilled",
            source: "metaAds",
            adsDetails: {
              formId: form.id,
              campaign_id: lead.campaign_id,
              leadId: lead.id,
              ad_name: lead.ad_name
            },
            extraDetails,
            // createdAt: // ✅ keep original time
          });

          console.log(newLead._id)

          // if(lead.id ==="943123981567943"){
          //             await Lead.create({
          //   fullName: full_name,
          //   email,
          //   phone: phone_number || phone,
          //   city,
          //   coursePreference: "unfilled",
          //   source: "metaAds",
          //   adsDetails: {
          //     formId: form.id,
          //     campaign_id: lead.campaign_id,
          //     leadId: lead.id,
          //     ad_name: lead.ad_name
          //   },
          //   extraDetails,
          //   createdAt: createdTime // ✅ keep original time
          // });
          // }

          console.log("✅ Inserted:", lead.id);
        }
      }

      nextUrl = data.paging?.next || null;
    }
  }

  console.log("🎉 Done syncing leads");
};
// getAllLeadsAndInsert()


async function leadDetail() {
  const token = "EAA8w7TGqzLwBQfRmsh3U0Cdm31wRic9YmNU7L5qXRoJKCBspZBheUjcxr93BPMvtZCmA4gkNvY6gEZCA9nsbCnaysBBATSJblbH87N7tF64FQliJJzUTnfIZANBk4sMBPxSYKQZAb1hno4DyPTXGcb2bHDiiAFBQSFuVZASEfmPBzLL7ZADh7stIdVeVShg1OW6pZBPQSrAZD"
  const leadId = "786768460745024";

  const response = await fetch(
    `https://graph.facebook.com/v19.0/${leadId}?fields=id,created_time,ad_id,ad_name,adset_id,adset_name,campaign_id,custom_disclaimer_responses,field_data,form_id&access_token=${token}`
  );

  const leadData = await response.json();
  console.log(leadData);
}

// leadDetail();


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

    // pageid ="`221710514363587`"

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