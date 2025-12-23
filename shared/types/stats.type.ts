
export type Download = {
  startedAt: number
  startedAtString: string
  endedAt: number
  service: string
  app: string
  bytesDownloaded: number
  appName: string
  appImage: string
  depots: string[]
}

export type ActiveDownload = {
  startedAt: number
  startedAtString: string
  lastSeen: number
  bytesDownloaded: number
  depots: string[]
}

export type CachedApp = {
  appId: string
  appName: string
  appImage: string
}

export type Stats = {
  bytesDownloaded: number,
  bytesReused: number,
  downloads: Download[]
  reuses: Download[]
}
