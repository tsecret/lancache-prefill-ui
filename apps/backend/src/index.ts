import { Hono } from 'hono';
import { docker } from './docker';
import containers from './routes/containers';
import images from './routes/images';
import { check, configureLogger } from './utils';

configureLogger()
const app = new Hono()

docker.initialize().catch((err) => {
  console.error('Failed to initialize Docker connection:', err)
})

app.get('/', (c) => {
  return c.text('ok')
})

app.post('/api/check', async (c) => {
  const checked = await check();
  return c.json(checked)
})

app.route('/api/containers', containers)
app.route('/api/images', images)

export default app
