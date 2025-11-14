
export type Container = {
  id: string
  name: string
  created: number
  state: "created" | "running" | "paused" | "restarting" | "exited" | "removing" | "dead"
  uptime: string
  isDownloading?: boolean
  downloadPercent?: number
}
