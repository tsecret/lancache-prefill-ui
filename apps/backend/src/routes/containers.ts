import { Hono } from 'hono'
import { docker } from '../clients/docker'
import { populateContainerWithLog } from '../utils'

const app = new Hono()

app.get('/', async (c) => {
  const containers = await docker.containerList()

  for (const i in containers){
    const logs = await docker.getContainerLogs(containers[i].id)
    if (logs.length)
      containers[i] = populateContainerWithLog(containers[i], logs)
  }

  return c.json(containers)
})

app.post('/prefill', async (c) => {
  const { tag, autoremove } = await c.req.json()
  await docker.containerRun(tag, autoremove)
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

app.post('/pause', async (c) => {
  const { id } = await c.req.json()
  await docker.containerPause(id)
  return c.json({})
})

app.post('/unpause', async (c) => {
  const { id } = await c.req.json()
  await docker.containerUnpause(id)
  return c.json({})
})

export default app
