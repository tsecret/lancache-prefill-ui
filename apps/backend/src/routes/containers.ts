import { Hono } from 'hono'
import { DockerClient } from '@docker/node-sdk';

const app = new Hono()

let docker: DockerClient

(async () => {
  docker = await DockerClient.fromDockerHost('tcp://192.168.31.100:2735');
})();

app.get('/', async (c) => {
  const containers = await docker.containerList({ all: true });
  return c.json(containers)
})

export default app
