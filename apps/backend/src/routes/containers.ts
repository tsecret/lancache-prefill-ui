import { Hono } from 'hono'
import { docker } from '../docker'
import { populateContainerWithLog } from '../utils'

const app = new Hono()

app.get('/', async (c) => {
  const containers = await docker.containerList()

  for (const i in containers){
    const log = await docker.getContainerLog(containers[i].id)
    if (log)
      containers[i] = populateContainerWithLog(containers[i], log)
  }

  return c.json(containers)
})

app.post('/prefill', async (c) => {
  const { tag } = await c.req.json()
  await docker.containerRun(tag)
  return c.json({})
})

app.post('/stop', async (c) => {
  const { id } = await c.req.json()
  await docker.containerStop(id)
  return c.json({})
})

app.get('/logs', async (c) => {
  const { id } = c.req.query()
  const log = await docker.getContainerLog(id)
  return c.json(log)
})

export default app
