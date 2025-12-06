import { Hono } from 'hono'
import { steamClient } from '../clients/steam'
import { getContainerSettingsFromTag } from '../utils'
import { BattlenetGame, ImageTag, SteamGame } from 'shared/types'

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
  await selectedAppsFile.write(JSON.stringify(apps, null, 2))

  return c.json({ success: true })
})

app.get('/battlenet', async (c) => {
  const BATTLENET_APPS = {
    'hsb': {
      appId: 'hsb',
      name: 'Hearthstone',
      imgUrl: "https://upload.wikimedia.org/wikipedia/en/f/f2/Hearthstone_2016_logo.png?20200131122824"
    },
    'pro': {
      appId: 'pro',
      name: 'Overwatch 2',
      imgUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2357570/e9cfc3828ebc0501e81a35760c451eb3b0734dea/header.jpg"
    }
  }
  const { configPath } = getContainerSettingsFromTag(ImageTag.BATTLENET)
  const selectedAppsFile = Bun.file(`${configPath}/selectedAppsToPrefill.json`)
  const selectedApps: string[] = await selectedAppsFile.json()

  return c.json(
    Object.values(BATTLENET_APPS)
      .map(app => ({
        appid: app.appId,
        name: app.name,
        imgUrl: app.imgUrl,
        selected: selectedApps.includes(app.appId),
      } satisfies BattlenetGame))
  )
})

app.post('/battlenet', async (c) => {
  const { apps } = await c.req.json<{ apps: number[] }>()
  const { configPath } = getContainerSettingsFromTag(ImageTag.BATTLENET)

  const selectedAppsFile = Bun.file(`${configPath}/selectedAppsToPrefill.json`)
  await selectedAppsFile.write(JSON.stringify(apps, null, 2))

  return c.json({ success: true })
})

export default app
