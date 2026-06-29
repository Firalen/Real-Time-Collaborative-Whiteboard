export function googleCalendarUrl(title: string, dueDate?: string, description?: string) {
  const start = dueDate ? new Date(dueDate) : new Date();
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    details: description || '',
    dates: `${fmt(start)}/${fmt(end)}`,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
