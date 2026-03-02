export default function Home() {
  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '2rem' }}>
      <h1>Next.js + pg-safe-migrate</h1>
      <p>
        This starter template uses{' '}
        <a href="https://github.com/defnotwig/pg-safe-migrate">pg-safe-migrate</a>{' '}
        for safe PostgreSQL schema migrations.
      </p>

      <h2>API Routes</h2>
      <ul>
        <li>
          <code>GET /api/posts</code> — List all posts
        </li>
        <li>
          <code>POST /api/posts</code> — Create a post (body: title, slug, content)
        </li>
      </ul>

      <h2>Quick Start</h2>
      <pre>
        {`docker compose up -d
pnpm db:up
pnpm dev`}
      </pre>
    </main>
  );
}
