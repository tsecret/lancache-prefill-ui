export type Settings = {
  check: {
    enabled: boolean
    cron: string
  },
  restriction: {
    enabled: boolean,
    allowedTimeWindow: [number, number]
  }
}
