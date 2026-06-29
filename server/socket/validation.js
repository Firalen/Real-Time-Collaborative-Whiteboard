const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_CANVAS_BYTES = 8 * 1024 * 1024;

function isValidUUID(value) {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

function validateDrawEvent(data) {
  if (!data || typeof data !== 'object') return false;
  const validTypes = ['object-added', 'object-modified', 'object-removed', 'canvas-clear'];
  if (!validTypes.includes(data.type)) return false;
  if (data.type === 'canvas-clear') return true;
  return data.object && typeof data.object === 'object';
}

function validateCanvasData(canvasData) {
  if (!canvasData || typeof canvasData !== 'object') return false;
  const size = JSON.stringify(canvasData).length;
  return size <= MAX_CANVAS_BYTES;
}

function validateCursorMove(data) {
  if (!data || typeof data !== 'object') return false;
  return (
    typeof data.x === 'number' &&
    typeof data.y === 'number' &&
    Number.isFinite(data.x) &&
    Number.isFinite(data.y)
  );
}

function sanitizeGuestName(name) {
  if (typeof name !== 'string') return 'Guest';
  return name.trim().slice(0, 50) || 'Guest';
}

module.exports = {
  isValidUUID,
  validateDrawEvent,
  validateCanvasData,
  validateCursorMove,
  sanitizeGuestName,
};
