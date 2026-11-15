import { cors, isOwner, validatedSubscription, saveSubscription, deleteSubscription } from '../lib/core.js';

export default async function handler(req, res) {
  if (!cors(req, res)) { if (!res.writableEnded) res.status(403).json({ error: 'Origin not allowed' }); return; }
  if (!['POST','DELETE'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  if (!isOwner(req.body?.code)) return res.status(401).json({ error: 'Incorrect reminder access code' });
  try {
    if (req.method === 'POST') {
      const subscription = validatedSubscription(req.body?.subscription);
      if (!subscription) return res.status(400).json({ error: 'Invalid push subscription' });
      await saveSubscription(subscription);
      return res.status(200).json({ ok: true });
    }
    const endpoint = req.body?.endpoint;
    if (typeof endpoint !== 'string' || endpoint.length > 2048) return res.status(400).json({ error: 'Invalid endpoint' });
    await deleteSubscription(endpoint);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('MOTION12 subscription persistence failed', error?.message);
    return res.status(500).json({ error: 'Subscription could not be saved' });
  }
}
