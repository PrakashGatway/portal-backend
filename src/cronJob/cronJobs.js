import cron from 'node-cron';
import { createMissingWallets, validateAllWallets } from './missingWallets.js';

import mongoose from 'mongoose';
import crypto from 'crypto';
import { Lead } from '../models/Leads.js';
import axios from 'axios';


const setupWalletCronJob = () => {
    cron.schedule('0 0 * * *', async () => {
        console.log('🔄 Running nightly wallet creation job at 12 AM...');
        console.log('📅', new Date().toISOString());
        try {
            const result = await createMissingWallets();
            if (result.success) {
                console.log(`✅ Nightly wallet creation completed: ${result.message}`);
                if (result.created > 0) {
                    console.log(`📈 Created ${result.created} new wallets`);
                }
            } else {
                console.error(`❌ Nightly wallet creation failed: ${result.message}`);
            }
        } catch (error) {
            console.error('❌ Error in nightly wallet creation:', error);
        }
    });
};

const runManualCheck = async () => {
    console.log('🔄 Running manual wallet check...');
    try {
        const result = await createMissingWallets();
        console.log('Manual check result:', result);
        return result;
    } catch (error) {
        console.error('Manual check failed:', error);
        throw error;
    }
};


function sha256Hex(value) {
  if (!value) return null;
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

function mapLeadStatus(status) {
  const s = String(status).toLowerCase();
  if (s === 'interested') return 'interested';
  if (s === 'notinterested' || s === 'notinterested' || s === 'notinterested') return 'notinterested';
  if (status === 'notInterested' || status === 'rejected') return 'notinterested';
  return null;
}

function buildEvent(lead, mappedStatus) {
  const eventTime = Math.floor(Date.now() / 1000);
  const eventId = String(lead._id);

  const user_data = {};

  if (lead.email) user_data.em = [sha256Hex(lead.email)];
  if (lead.phone) user_data.ph = [sha256Hex(lead.phone)];

  return {
    event_name: 'Lead',
    event_id: eventId,
    event_time: eventTime,
    action_source: 'website',
    user_data,
    custom_data: {
      lead_status: mappedStatus
    }
  };
}

async function sendToMeta(events) {
  const url = `https://graph.facebook.com/v19.0/2571040793250573/events?access_token=EAA8w7TGqzLwBP552Pjvw5WTgSXCzD5ZC7ZB9FwAfIE1itluz0p7WihCan0QQopBiiZArN8n8Tuh7ak9833TEY6JVT1NVnDbrYf3joM0k5XGZB7iEMwpKmhpcCGrz8sVlZAZBMkrhbNbZCvBYHLzgu3h70aksxFiMjLZCuA8AvWhWaUG72HpgGkKofgWWikLxDUlzlqaZABiNr7AIv85oG`;
  const res = await axios.post(url, { data: events });
  return res.data;
}

async function processLeadsForMeta() {
  console.log('🔄 Meta Cron Started:', new Date().toISOString());

  const leads = await Lead.find({
    source:"metaAds",
    status: { $in: ['interested', 'notInterested', 'rejected'] },
    'extraDetails.m_capi': { $ne: true }
  }).lean();

  if (!leads.length) {
    console.log('✔ No new leads to send.');
    return;
  }

  const events = [];

  for (const lead of leads) {
    const mapped = mapLeadStatus(lead.status);
    if (!mapped) continue;

    if (!lead.email && !lead.phone) {
      console.log(`⚠️ Skipped ${lead._id}: no email/phone`);
      continue;
    }

    events.push(buildEvent(lead, mapped));
  }

  if (!events.length) {
    console.log('✔ Nothing to send after filtering.');
    return;
  }

  try {
    const fbResp = await sendToMeta(events);
    console.log('📩 Meta Response:', fbResp);

    const ids = leads.map(l => l._id);
    await Lead.updateMany(
      { _id: { $in: ids } },
      { $set: { 'extraDetails.m_capi': true } }
    );

    console.log('✔ Leads marked as sent to Meta.');
  } catch (err) {
    console.error('❌ Error sending to Meta:', err.message);
  }
}
const CRON_SCHEDULE = '0 22 * * *';

// cron.schedule(
//   CRON_SCHEDULE,
//   () => {
//     processLeadsForMeta().catch(err =>
//       console.error('❌ Cron Error:', err.message)
//     );
//   },
//   { scheduled: true, timezone: 'Asia/Kolkata' }
// );



export { setupWalletCronJob, runManualCheck };