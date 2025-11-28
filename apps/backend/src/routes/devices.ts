import { fetch } from 'bun'
import { Hono } from 'hono'

const app = new Hono()

app.get('/', async (c) => {
  const res = await fetch(`${process.env.WATCHYOURLAN_HOST}/api/all`)

  if (res.status === 200)
    return c.json(await res.json())

  return c.notFound()
})

export default app
