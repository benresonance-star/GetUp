import { allSubscriptionBlobs, loadBlob, saveSubscription, deleteSubscription, sendPush, melbourneClock } from './core.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const bearer = req.headers.authorization;
  if (!process.env.CRON_SECRET || bearer !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { date, hour } = melbourneClock();
  if (hour !== 19) return res.status(200).json({ skipped: true, reason: 'Outside Melbourne evening hour' });
  try {
    const blobs = await allSubscriptionBlobs();
    let accepted = 0, expired = 0, failed = 0;
    for (const blob of blobs) {
      const record = await loadBlob(blob.pathname);
      if (!record?.subscription?.endpoint || record.lastSentDate === date) continue;
      try {
        const result = await sendPush(record.subscription);
        if (result.statusCode === 201) {
          await saveSubscription(record.subscription, date);
          accepted++;
        } else failed++;
      } catch (error) {
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          await deleteSubscription(record.subscription.endpoint);
          expired++;
        } else {
          console.error('MOTION12 scheduled push rejected', error?.statusCode || error?.message);
          failed++;
        }
      }
    }
    return res.status(200).json({ date, accepted, expired, failed });
  } catch (error) {
    console.error('MOTION12 cron store unavailable', error?.message);
    return res.status(500).json({ error: 'Notification store unavailable' });
  }
}
