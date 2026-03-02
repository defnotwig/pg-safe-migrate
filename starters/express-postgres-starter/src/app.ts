import express, { type Request, type Response } from 'express';
import usersRouter from './routes/users.js';

const app = express();
const port = Number.parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.use('/users', usersRouter);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

export default app;
