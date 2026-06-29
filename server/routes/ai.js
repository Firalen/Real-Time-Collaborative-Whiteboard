const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const ai = require('../services/ai');
const billing = require('../services/billing');

const router = express.Router({ mergeParams: true });
router.use(authMiddleware);

router.post('/mind-map', async (req, res) => {
  try {
    const { topic, boardId } = req.body;
    if (!topic?.trim()) return res.status(400).json({ error: 'Topic required' });

    const workspaceId = req.params.workspaceId;
    const usage = await billing.checkLimit(workspaceId, 'ai_requests_monthly');
    if (!usage.allowed) {
      return res.status(402).json({ error: 'AI request limit reached', ...usage });
    }

    const request = await ai.createRequest({
      workspaceId,
      boardId,
      userId: req.user.id,
      type: 'mind_map',
      prompt: topic,
    });

    const { data, tokens } = await ai.generateMindMap(topic.trim());
    const completed = await ai.completeRequest(request.id, data, tokens);
    await billing.recordUsage(workspaceId, 'ai_requests_monthly');

    res.json({ nodes: data, requestId: completed.id });
  } catch (err) {
    res.status(500).json({ error: err.message || 'AI mind map failed' });
  }
});

router.post('/summarize', async (req, res) => {
  try {
    const { notes, boardId } = req.body;
    if (!notes?.length) return res.status(400).json({ error: 'Notes array required' });

    const workspaceId = req.params.workspaceId;
    const request = await ai.createRequest({
      workspaceId, boardId, userId: req.user.id, type: 'summarize', prompt: notes.join('\n'),
    });
    const { summary, tokens } = await ai.summarizeNotes(notes);
    await ai.completeRequest(request.id, { summary }, tokens);
    await billing.recordUsage(workspaceId, 'ai_requests_monthly');
    res.json({ summary });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Summarize failed' });
  }
});

router.post('/layout', async (req, res) => {
  try {
    const { elements, boardId } = req.body;
    const workspaceId = req.params.workspaceId;
    const request = await ai.createRequest({
      workspaceId, boardId, userId: req.user.id, type: 'layout', prompt: JSON.stringify(elements),
    });
    const { layout, tokens } = await ai.suggestLayout(elements);
    await ai.completeRequest(request.id, layout, tokens);
    res.json({ layout });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Layout suggestion failed' });
  }
});

router.post('/improve-text', async (req, res) => {
  try {
    const { text, boardId } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: 'Text required' });
    const workspaceId = req.params.workspaceId;
    const { text: improved, tokens } = await ai.improveText(text);
    await ai.createRequest({
      workspaceId, boardId, userId: req.user.id, type: 'writing', prompt: text,
    });
    await billing.recordUsage(workspaceId, 'ai_requests_monthly');
    res.json({ text: improved, tokens });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Text improvement failed' });
  }
});

router.post('/image', async (req, res) => {
  try {
    const { prompt, boardId } = req.body;
    if (!prompt?.trim()) return res.status(400).json({ error: 'Prompt required' });
    const workspaceId = req.params.workspaceId;
    const usage = await billing.checkLimit(workspaceId, 'ai_requests_monthly');
    if (!usage.allowed) return res.status(402).json({ error: 'AI limit reached', ...usage });

    const request = await ai.createRequest({
      workspaceId, boardId, userId: req.user.id, type: 'image_gen', prompt,
    });
    const result = await ai.generateImage(prompt.trim());
    await ai.completeRequest(request.id, result);
    await billing.recordUsage(workspaceId, 'ai_requests_monthly');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Image generation failed' });
  }
});

router.post('/search', async (req, res) => {
  try {
    const { query, boardContent, boardId } = req.body;
    const workspaceId = req.params.workspaceId;
    const { results, tokens } = await ai.smartSearch(boardContent || '', query);
    await ai.createRequest({
      workspaceId, boardId, userId: req.user.id, type: 'search', prompt: query,
    });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Smart search failed' });
  }
});

module.exports = router;
