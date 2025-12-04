import { Hono } from 'hono'
import { loadSettings, saveSettings } from '../utils'

const app = new Hono()

app.get('/', async (c) => {
  const settings = await loadSettings()
  return c.json(settings)
})

app.post('/', async (c) => {
  const settings = await c.req.json()
  await saveSettings(settings)
  return c.json(settings)
})

export default app
