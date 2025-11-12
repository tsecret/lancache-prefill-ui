import { Hono } from 'hono'
import { DockerClient } from '@docker/node-sdk';

const app = new Hono()

let docker: DockerClient

(async () => {
  docker = await DockerClient.fromDockerHost('tcp://192.168.31.100:2735');
})();

app.get('/', async (c) => {
  const images = await docker.imageList();
  return c.json(images.filter(image => image.RepoTags[0].includes('tpill90')))
})

app.post('/pull', async (c) => {
  const { tag } = await c.req.json()
  const response = docker.imageCreate({ fromImage: tag });
  await response.wait()
  return c.json([])
})

app.delete('/delete', async (c) => {
  const { name } = await c.req.json()
  const response = await docker.imageDelete(name);
  console.log('res', response)
  return c.json([])
})

export default app
