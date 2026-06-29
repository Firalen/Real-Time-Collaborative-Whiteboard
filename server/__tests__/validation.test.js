const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  isValidUUID,
  validateDrawEvent,
  validateCanvasData,
  validateCursorMove,
  sanitizeGuestName,
} = require('../socket/validation');

describe('socket validation', () => {
  it('validates UUIDs', () => {
    assert.equal(isValidUUID('550e8400-e29b-41d4-a716-446655440000'), true);
    assert.equal(isValidUUID('not-a-uuid'), false);
    assert.equal(isValidUUID(''), false);
  });

  it('validates draw events', () => {
    assert.equal(validateDrawEvent({ type: 'canvas-clear' }), true);
    assert.equal(validateDrawEvent({ type: 'object-added', object: { type: 'rect' } }), true);
    assert.equal(validateDrawEvent({ type: 'invalid' }), false);
    assert.equal(validateDrawEvent(null), false);
  });

  it('validates canvas data size', () => {
    assert.equal(validateCanvasData({ objects: [] }), true);
    assert.equal(validateCanvasData(null), false);
    const huge = { data: 'x'.repeat(9 * 1024 * 1024) };
    assert.equal(validateCanvasData(huge), false);
  });

  it('validates cursor moves', () => {
    assert.equal(validateCursorMove({ x: 10, y: 20 }), true);
    assert.equal(validateCursorMove({ x: 'bad', y: 20 }), false);
    assert.equal(validateCursorMove(null), false);
  });

  it('sanitizes guest names', () => {
    assert.equal(sanitizeGuestName('  Alice  '), 'Alice');
    assert.equal(sanitizeGuestName(''), 'Guest');
    assert.equal(sanitizeGuestName('a'.repeat(100)).length, 50);
  });
});
