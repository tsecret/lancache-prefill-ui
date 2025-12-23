import { getLogger } from "@logtape/logtape";
import { type Container, type Image } from "shared/types";
import { getContainerSettingsFromTag } from "../utils";
import Docker = require('dockerode');

class DockerService {
  private client: Docker | null = null
  private readonly host: string
  private logger = getLogger(['lancache-manager'])

  constructor(host: string = 'unix:/var/run/docker.sock') {
    this.host = host
  }

  private async getClient(): Promise<Docker> {
    if (this.client) {
      return this.client
    }

    this.client = Bun.env.DEV === 'true' ?
      new Docker({host: 'http://192.168.31.140', port: 2375}) :
      new Docker({socketPath: '/var/run/docker.sock'})

    return this.client
  }

  async imageList(): Promise<Image[]> {
    const client = await this.getClient()

    const IMAGES = [
      'tsecretino/steam-lancache-prefill-raspi',
      'tsecretino/battlenet-lancache-prefill-raspi',
      'tsecretino/epic-lancache-prefill-raspi'
    ]

    const pulledImages: Record<string, Image> = {}
    for (const image of await client.listImages()){
      const tag = image.RepoTags?.length ? image.RepoTags[0].split(':')[0] : ''
      pulledImages[tag] = {
        tag,
        id: image.Id.slice(7, 19),
        isPulled: true
      }
    }

    return IMAGES.map(tag => {

      if (tag in pulledImages)
        return pulledImages[tag]

      return {
        tag,
        id: '',
        isPulled: false
      }
    })
  }

  async imagePull(tag: string): Promise<void> {
    const client = await this.getClient()
    this.logger.info(`Pulling image ${tag}`)
    await client.pull(tag)
    this.logger.info(`Pulled image ${tag}`)
  }

  async imageDelete(name: string): Promise<void> {
    this.logger.info(`Deleting image ${name}`)
    const client = await this.getClient()
    await client.getImage(name).remove()
  }

  async containerList(): Promise<Container[]> {
    const client = await this.getClient()
    const containers = await client.listContainers({all: true})

    return containers
      .filter(c => c.Image?.includes('-lancache-prefill-raspi'))
      .map(c => ({
        id: c.Id?.slice(0, 12) || '',
        image: c.Image,
        name: c.Names?.length ? c.Names[0] : '',
        created: c.Created || 0,
        state: (c.State as "created" | "running" | "paused" | "restarting" | "exited" | "removing" | "dead") || 'dead',
        uptime: c.Status || ''
      }))
  }

  async containerRun(tag: string, autoremove = true): Promise<boolean> {
    const client = await this.getClient()
    const { configPath, cachePath, containerName } = getContainerSettingsFromTag(tag)

    this.logger.info(`Starting container ${tag}`)

    const container = await client.createContainer(
      {
        Image: tag,
        name: containerName,
        Cmd: tag.includes('steam') ? ['prefill', '--cellid', '66'] : ['prefill'],
        Tty: true,
        HostConfig: {
          AutoRemove: autoremove,
          Binds: [
            `${configPath}:/app/Config`,
            `${cachePath}:/root/.cache`
          ]
        }
      }
    )

    if (container.id){
      this.logger.info(`Container ${tag} created`)
      await container.start()
      this.logger.info(`Container ${tag} started`)
      await container.wait()
      this.logger.info(`Container ${tag} finished`)
      return true
    }

    return false
  }

  async containerPause(id: string){
    const client = await this.getClient()
    const container =  client.getContainer(id)
    await container.pause()
    this.logger.info(`Container ${(await container.inspect()).Name} paused`)
  }

  async containerUnpause(id: string){
    const client = await this.getClient()
    const container = client.getContainer(id)
    await container.unpause()
    this.logger.info(`Container ${(await container.inspect()).Name} paused`)
  }

  async containerStop(id: string){
    const client = await this.getClient()
    const container = client.getContainer(id)
    this.logger.info(`Stopping container ${(await container.inspect()).Name}`)
    await container.stop()
    this.logger.info(`Container ${(await container.inspect()).Name} was stopped`)
  }

  async getContainerLog(id: string): Promise<string|null>{
    const client = await this.getClient()

    const r = await client
      .getContainer(id)
      .logs({ follow: false, stdout: true, tail: 5 })

    const logs = r.toString()
      .split('\n')
      .map(line => line.trim().replace(/\u001b\[.*?m/g, ''))

    if (logs.length > 2)
      return logs[logs.length-2].trim()

    return null
  }

}

export const docker = new DockerService()
