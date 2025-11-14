import { Hono } from 'hono'
import { docker } from '../docker'
import { getLogger } from '@logtape/logtape'

const app = new Hono()

app.get('/', async (c) => {
  const images = await docker.imageList()
  return c.json(images)
})

app.post('/pull', async (c) => {
  const { tag } = await c.req.json()
  await docker.imagePull(tag)
  return c.json({ success: true })
})

app.delete('/delete', async (c) => {
  const { name } = await c.req.json()
  await docker.imageDelete(name)
  return c.json({ success: true })
})

export default app
