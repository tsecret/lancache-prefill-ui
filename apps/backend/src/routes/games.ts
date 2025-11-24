import { Hono } from 'hono'
import { steamClient } from '../clients/steam'
import { getContainerSettingsFromTag } from '../utils'
import { ImageTag, SteamGame } from 'shared/types'

const app = new Hono()

app.get('/steam', async (c) => {
  const apps = await steamClient.listApps()
  const { configPath } = getContainerSettingsFromTag(ImageTag.STEAM)

  const selectedAppsFile = Bun.file(`${configPath}/selectedAppsToPrefill.json`)
  const selectedApps: number[] = await selectedAppsFile.json()

  return c.json(
    apps.response.games.map(app => ({
      appid: app.appid,
      name: app.name,
      selected: selectedApps.includes(app.appid),
      imgUrl: '',
      hoursPlayed: Math.floor(app.playtime_forever / 60)
    }))
    .sort((a, b) => b.hoursPlayed - a.hoursPlayed) satisfies SteamGame[]
  )
})

app.post('/steam', async (c) => {
  const { apps } = await c.req.json<{ apps: number[] }>()
  const { configPath } = getContainerSettingsFromTag(ImageTag.STEAM)

  const selectedAppsFile = Bun.file(`${configPath}/selectedAppsToPrefill.json`)
  await selectedAppsFile.write(JSON.stringify(apps))

  return c.json({ success: true })
})

export default app
