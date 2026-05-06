import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { analyzeRouter } from './routes/analyze';
import { chatRouter } from './routes/chat';
import { executeRouter } from './routes/execute';
import { profileRouter } from './routes/profile';
import { researchRouter } from './routes/research';
import { pipelineRouter } from './routes/pipeline';
import { knowledgeRouter } from './routes/knowledge';
import { charactersRouter } from './routes/characters';
import { brandRouter } from './routes/brand';
import { historyRouter } from './routes/history';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3333;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));

app.use('/analyze', analyzeRouter);
app.use('/chat', chatRouter);
app.use('/execute', executeRouter);
app.use('/profile', profileRouter);
app.use('/research', researchRouter);
app.use('/pipeline', pipelineRouter);
app.use('/knowledge', knowledgeRouter);
app.use('/characters', charactersRouter);
app.use('/brand', brandRouter);
app.use('/history', historyRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.listen(PORT, () => {
  console.log(`Premiere AI Server running on http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('WARNING: ANTHROPIC_API_KEY not set. Create a .env file from .env.example');
  }
});
