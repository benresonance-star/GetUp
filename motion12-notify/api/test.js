import { cors, isOwner, loadSubscription, sendPush, deleteSubscription } from '../lib/core.js';

export default async function handler(req, res) {
  if (!cors(req, res)) { if (!res.writableEnded) res.status(403).json({ error: 'Origin not allowed' }); return; }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!isOwner(req.body?.code)) return res.status(401).json({ error: 'Incorrect reminder access code' });
  const endpoint = req.body?.endpoint;
  if (typeof endpoint !== 'string' || endpoint.length > 2048) return res.status(400).json({ error: 'Invalid endpoint' });
  try {
    const record = await loadSubscription(endpoint);
    if (!record?.subscription) return res.status(404).json({ error: 'Enable the reminder first' });
    const result = await sendPush(record.subscription, true);
    return res.status(200).json({ ok: true, accepted: result.statusCode === 201 });
  } catch (error) {
    console.error('MOTION12 test push failed', error?.statusCode || error?.message);
    if (error?.statusCode === 404 || error?.statusCode === 410) await deleteSubscription(endpoint);
    return res.status(502).json({ error: 'Push service did not accept the notification' });
  }
}
