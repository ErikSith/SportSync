import { createApp } from './app';
import { config } from './config';
import { startScheduler } from './jobs/scheduler';

const app = createApp();

app.listen(config.port, () => {
  console.log(`SportSync backend listening on http://localhost:${config.port}`);
  console.log(`AI agent endpoints: /api/ai/* (header x-agent-key required)`);
  startScheduler();
});
