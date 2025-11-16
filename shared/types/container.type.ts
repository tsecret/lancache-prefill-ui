
export type Container = {
  id: string
  name: string
  image: string
  created: number
  state: "created" | "running" | "paused" | "restarting" | "exited" | "removing" | "dead"
  uptime: string
  progress?: {
    isDownloading: boolean
    percent: number
    time: string
    downloadedAmount: number
    downloadLeftAmount: number
    unitAmount: string
    speed: number
    unitSpeed: string
  }
}
