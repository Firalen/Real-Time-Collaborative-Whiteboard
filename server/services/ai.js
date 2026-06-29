const pool = require('../db/pool');

const OPENAI_KEY = process.env.OPENAI_API_KEY;

async function createRequest({ workspaceId, boardId, userId, type, prompt }) {
  const { rows } = await pool.query(
    `INSERT INTO ai_requests (workspace_id, board_id, user_id, type, prompt, status)
     VALUES ($1, $2, $3, $4, $5, 'processing')
     RETURNING *`,
    [workspaceId, boardId, userId, type, prompt],
  );
  return rows[0];
}

async function completeRequest(id, result, tokensUsed = 0) {
  const { rows } = await pool.query(
    `UPDATE ai_requests SET status = 'completed', result = $2, tokens_used = $3 WHERE id = $1 RETURNING *`,
    [id, JSON.stringify(result), tokensUsed],
  );
  return rows[0];
}

async function failRequest(id, errorMessage) {
  await pool.query(
    `UPDATE ai_requests SET status = 'failed', error_message = $2 WHERE id = $1`,
    [id, errorMessage],
  );
}

async function callOpenAI(messages, { json = false } = {}) {
  if (!OPENAI_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages,
      response_format: json ? { type: 'json_object' } : undefined,
      temperature: 0.7,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error: ${err}`);
  }
  const data = await res.json();
  return {
    content: data.choices[0].message.content,
    tokens: data.usage?.total_tokens || 0,
  };
}

async function generateMindMap(topic) {
  const { content, tokens } = await callOpenAI([
    {
      role: 'system',
      content: 'Generate a mind map as JSON: { "root": string, "nodes": [{ "id", "label", "parentId", "x", "y" }] }. Place nodes in a radial layout.',
    },
    { role: 'user', content: topic },
  ], { json: true });
  return { data: JSON.parse(content), tokens };
}

async function summarizeNotes(notes) {
  const { content, tokens } = await callOpenAI([
    { role: 'system', content: 'Summarize sticky notes into one concise paragraph.' },
    { role: 'user', content: notes.join('\n') },
  ]);
  return { summary: content, tokens };
}

async function suggestLayout(elementDescriptions) {
  const { content, tokens } = await callOpenAI([
    {
      role: 'system',
      content: 'Suggest layout positions as JSON array: [{ "id", "x", "y" }] for better visual arrangement.',
    },
    { role: 'user', content: JSON.stringify(elementDescriptions) },
  ], { json: true });
  return { layout: JSON.parse(content), tokens };
}

async function improveText(text) {
  const { content, tokens } = await callOpenAI([
    { role: 'system', content: 'Improve the writing while keeping the same meaning. Return only the improved text.' },
    { role: 'user', content: text },
  ]);
  return { text: content, tokens };
}

async function generateImage(prompt) {
  if (!OPENAI_KEY) throw new Error('OPENAI_API_KEY is not configured');
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return { url: data.data[0].url, revisedPrompt: data.data[0].revised_prompt };
}

async function smartSearch(boardContent, query) {
  const { content, tokens } = await callOpenAI([
    {
      role: 'system',
      content: 'Find elements matching the natural language query. Return JSON: { "matches": [{ "elementId", "reason" }] }.',
    },
    { role: 'user', content: `Query: ${query}\n\nCanvas content:\n${boardContent}` },
  ], { json: true });
  return { results: JSON.parse(content), tokens };
}

module.exports = {
  createRequest,
  completeRequest,
  failRequest,
  generateMindMap,
  summarizeNotes,
  suggestLayout,
  improveText,
  generateImage,
  smartSearch,
};
