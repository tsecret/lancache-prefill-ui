import { Hono } from 'hono';
import containers from './routes/containers';
import images from './routes/images';
import { check, configureLogger } from './utils';

configureLogger()
const app = new Hono()

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
