const Integration = require('../models/Integration');

async function notifySlack(workspaceId, message) {
  const integration = await Integration.get(workspaceId, 'slack');
  if (!integration?.enabled || !integration.config?.webhookUrl) return;

  try {
    await fetch(integration.config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: message }),
    });
  } catch (err) {
    console.error('Slack notification failed:', err.message);
  }
}

function googleCalendarUrl({ title, description, dueDate }) {
  const start = dueDate ? new Date(dueDate) : new Date();
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    details: description || '',
    dates: `${fmt(start)}/${fmt(end)}`,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

module.exports = { notifySlack, googleCalendarUrl };
