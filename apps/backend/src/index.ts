import { Hono } from 'hono'
import containers from './routes/containers'
import images from './routes/images'

const app = new Hono()

app.get('/', (c) => {
  return c.text('ok')
})

app.route('/api/containers', containers)
app.route('/api/images', images)

export default app
