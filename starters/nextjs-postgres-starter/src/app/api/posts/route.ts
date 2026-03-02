import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  const { rows } = await pool.query(
    'SELECT id, title, slug, published, created_at FROM posts ORDER BY created_at DESC',
  );
  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { title, slug, content } = body;

  if (!title || !slug) {
    return NextResponse.json(
      { error: 'title and slug are required' },
      { status: 400 },
    );
  }

  const { rows } = await pool.query(
    `INSERT INTO posts (title, slug, content)
     VALUES ($1, $2, $3)
     RETURNING id, title, slug, published, created_at`,
    [title, slug, content || ''],
  );

  return NextResponse.json(rows[0], { status: 201 });
}
