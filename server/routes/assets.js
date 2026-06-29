const express = require('express');
const multer = require('multer');
const pool = require('../db/pool');
const storage = require('../services/storage');
const { authMiddleware } = require('../middleware/auth');
const { requireWorkspaceRole } = require('../middleware/workspaceAuth');

const router = express.Router({ mergeParams: true });
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /^image\/(jpeg|png|gif|webp|svg\+xml)|application\/pdf$/;
    cb(null, allowed.test(file.mimetype));
  },
});

router.use(authMiddleware);

router.get('/', requireWorkspaceRole('viewer'), async (req, res) => {
  try {
    const assets = await storage.findByWorkspace(req.params.workspaceId);
    res.json(assets.map(formatAsset));
  } catch {
    res.status(500).json({ error: 'Failed to list assets' });
  }
});

router.post(
  '/',
  requireWorkspaceRole('editor'),
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'File required' });
      const asset = await storage.saveFile({
        workspaceId: req.params.workspaceId,
        uploadedBy: req.user.id,
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
      });
      res.status(201).json(formatAsset(asset));
    } catch {
      res.status(500).json({ error: 'Upload failed' });
    }
  },
);

router.delete('/:assetId', requireWorkspaceRole('editor'), async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM assets WHERE id = $1 AND workspace_id = $2`,
      [req.params.assetId, req.params.workspaceId],
    );
    res.json({ deleted: true });
  } catch {
    res.status(500).json({ error: 'Delete failed' });
  }
});

function formatAsset(a) {
  return {
    id: a.id,
    name: a.name,
    mimeType: a.mime_type,
    sizeBytes: Number(a.size_bytes),
    url: a.url,
    thumbnailUrl: a.thumbnail_url,
    tags: a.tags,
    createdAt: a.created_at,
  };
}

module.exports = router;
