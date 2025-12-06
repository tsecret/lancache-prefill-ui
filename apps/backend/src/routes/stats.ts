import { Hono } from 'hono'
import { ActiveDownload, RedisDepot, Services, Stats } from 'shared/types'
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { redis } from 'bun';

dayjs.extend(customParseFormat);

const app = new Hono()
const REGEX = /\[(\w+)] (\d+.\d+.\d+.\d+) \/ - - - \[(.*)] "GET (.*) HTTP\/1.1" (\d+) (\d+) "-" "(.*)" "(\w+)" "(.*)" "-"/

function endpointParse(service: Services, endpoint: string){
  switch (service){
    case Services.STEAM:
      const [, , depot, , hash] = endpoint.split('/')
      return { game: depot, hash }
    case Services.EPIC:
    case Services.BATTLENET:
      // const [, game, , , ]
    default:
      return { game: '', hash: '' }
    }
}

export async function readLogFile(filePath: string): Promise<string> {
  return Bun.file(filePath).text()
}

export async function parseLogFile(): Promise<Stats> {
  const PATH = `${Bun.env.LANCACHE_LOGS_PATH}/access.log`
  const LAST_SEEN_DIFF = 3 * 60 * 1000
  const TIME_FORMAT = "DD/MMM/YYYY:HH:mm:ss Z";
  const STEAM_DEPOT_MAP: Record<string, RedisDepot> = {}

  const stats: Stats = {
    bytesDownloaded: 0,
    bytesReused: 0,
    downloads: [],
    reuses: []
  }

  let activeDownloads: Record<string, Record<string, ActiveDownload>> = {}
  let activeReuses: Record<string, Record<string, ActiveDownload>> = {}

  const text = await readLogFile(PATH)
  const logs = text.split('\n')

  for (const line of logs){
    const match = line.match(REGEX)

    if (!match) continue

    const [, service, ip, datetime, endpoint, statusCode, byte, client, result, host] = match

    if (statusCode !== '200') continue

    if (result === 'MISS')
      stats.bytesDownloaded += parseInt(byte)

    if (result === 'HIT')
      stats.bytesReused += parseInt(byte)

    const { game, hash } = endpointParse(service as Services, endpoint)
    const parsedDate = dayjs(datetime, TIME_FORMAT);
    const timestamp = parsedDate.valueOf();

    if (service === 'steam'){
      // here game is depot

      if (!(game in STEAM_DEPOT_MAP)){
        const depot = await getAppFromDepot(game)
        STEAM_DEPOT_MAP[game] = depot
      }

      const appId = STEAM_DEPOT_MAP[game].appId

      const active = result === 'MISS' ? activeDownloads : activeReuses

      if (!(service in active))
        active[service] = {}

      if (!(appId in active[service])) {
        active[service][appId] = {
          startedAt: timestamp,
          lastSeen: timestamp,
          bytesDownloaded: 0
        }
      }

      if (timestamp - active[service][appId].lastSeen < LAST_SEEN_DIFF){
        active[service][appId].lastSeen = timestamp
        active[service][appId].bytesDownloaded += parseInt(byte)
      } else {
        const app = {
          startedAt: active[service][appId].startedAt,
          endedAt: active[service][appId].lastSeen,
          bytesDownloaded: active[service][appId].bytesDownloaded,
          service: service,
          app: appId.toString(),
          appImage: STEAM_DEPOT_MAP[game].appImage,
          appName: STEAM_DEPOT_MAP[game].appName
        }

        result === 'MISS' ? stats.downloads.push(app) : stats.reuses.push(app)
        stats.downloads.push()

        active[service][appId] = {
          startedAt: timestamp,
          lastSeen: timestamp,
          bytesDownloaded: parseInt(byte)
        }
    }
    }
  }

  for (const service in activeDownloads){
    for (const app in activeDownloads[service]){

      let depot = ''
      for (const _depot in STEAM_DEPOT_MAP){
        if (STEAM_DEPOT_MAP[_depot].appId.toString() === app){
          depot = _depot
          break
        }
      }

      stats.downloads.push({
        startedAt: activeDownloads[service][app].startedAt,
        endedAt: activeDownloads[service][app].lastSeen,
        bytesDownloaded: activeDownloads[service][app].bytesDownloaded,
        service,
        app: app,
        appImage: STEAM_DEPOT_MAP[depot].appImage,
        appName: STEAM_DEPOT_MAP[depot].appName
      })
    }
  }

  for (const service in activeReuses){
    for (const app in activeReuses[service]){

      let depot = ''
      for (const _depot in STEAM_DEPOT_MAP){
        if (STEAM_DEPOT_MAP[_depot].appId.toString() === app){
          depot = _depot
          break
        }
      }

      stats.reuses.push({
        startedAt: activeReuses[service][app].startedAt,
        endedAt: activeReuses[service][app].lastSeen,
        bytesDownloaded: activeReuses[service][app].bytesDownloaded,
        service,
        app: app,
        appImage: STEAM_DEPOT_MAP[depot].appImage,
        appName: STEAM_DEPOT_MAP[depot].appName
      })
    }
  }

  stats.downloads.sort((a, b) => b.startedAt - a.startedAt);
  stats.reuses.sort((a, b) => b.startedAt - a.startedAt);

  return stats
}

const getAppFromDepot = async (depotId: string): Promise<RedisDepot> => {
  const res = await redis.get(`depot:${depotId}`)
  return res ? JSON.parse(res) : { appId: 0, appName: "Unknown", appImage: '' }
}

export const scheduledLogParse = async (): Promise<void> => {
  const stats = await parseLogFile()
  await redis.set('stats', JSON.stringify(stats))
}

app.get('/', async (c) => {
  return c.json(await parseLogFile() satisfies Stats)
})

export default app
