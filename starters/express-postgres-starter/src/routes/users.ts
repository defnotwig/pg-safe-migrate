import { Router, type Request, type Response } from 'express';
import pool from '../db.js';

const router = Router();

// GET /users
router.get('/', async (_req: Request, res: Response) => {
  const { rows } = await pool.query(
    'SELECT id, email, name, created_at FROM users ORDER BY id',
  );
  res.json(rows);
});

// GET /users/:id
router.get('/:id', async (req: Request, res: Response) => {
  const { rows } = await pool.query(
    'SELECT id, email, name, created_at FROM users WHERE id = $1',
    [req.params.id],
  );
  if (rows.length === 0) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(rows[0]);
});

// POST /users
router.post('/', async (req: Request, res: Response) => {
  const { email, name } = req.body;
  if (!email || !name) {
    res.status(400).json({ error: 'email and name are required' });
    return;
  }
  const { rows } = await pool.query(
    'INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id, email, name, created_at',
    [email, name],
  );
  res.status(201).json(rows[0]);
});

export default router;
