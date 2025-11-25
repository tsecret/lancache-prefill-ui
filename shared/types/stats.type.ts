
export type Download = {
  startedAt: number
  endedAt: number
  service: string
  app: string
  bytesDownloaded: number
  appName: string
  appImage: string
}

export type ActiveDownload = {
  startedAt: number
  lastSeen: number
  bytesDownloaded: number
}

export type RedisDepot = {
  appId: number
  appName: string
  appImage: string
}

export type Stats = {
  bytesDownloaded: number,
  downloads: Download[]
}
