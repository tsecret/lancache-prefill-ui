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

async function parseLogFile(filePath: string) {
  const LAST_SEEN_DIFF = 3 * 60 * 1000
  const TIME_FORMAT = "DD/MMM/YYYY:HH:mm:ss Z";
  const STEAM_DEPOT_MAP: Record<string, RedisDepot> = {}

  const stats: Stats = {
    bytesDownloaded: 0,
    downloads: []
  }

  let activeDownloads: Record<string, Record<string, ActiveDownload>> = {}

  const foo = Bun.file(filePath);
  const log = await foo.text()
  const logs = log.split('\n')

  for (const line of logs){
    const match = line.match(REGEX)

    if (!match) continue

    const [, service, ip, datetime, endpoint, statusCode, byte, client, result, host] = match

    stats.bytesDownloaded += parseInt(byte)

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


      if (!(service in activeDownloads))
        activeDownloads[service] = {}

      if (!(appId in activeDownloads[service])) {
        activeDownloads[service][appId] = {
          startedAt: timestamp,
          lastSeen: timestamp,
          bytesDownloaded: 0
        }
      }

      if (timestamp - activeDownloads[service][appId].lastSeen < LAST_SEEN_DIFF){
        activeDownloads[service][appId].lastSeen = timestamp
        activeDownloads[service][appId].bytesDownloaded += parseInt(byte)
      } else {
        stats.downloads.push({
          startedAt: activeDownloads[service][appId].startedAt,
          endedAt: activeDownloads[service][appId].lastSeen,
          bytesDownloaded: activeDownloads[service][appId].bytesDownloaded,
          service: service,
          app: appId.toString(),
          appImage: STEAM_DEPOT_MAP[game].appImage,
          appName: STEAM_DEPOT_MAP[game].appName
        })

        activeDownloads[service][appId] = {
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

  return stats
}

const getAppFromDepot = async (depotId: string): Promise<RedisDepot> => {
  const res = await redis.get(`depot:${depotId}`)
  return res ? JSON.parse(res) : { appId: 0, appName: "Unknown", appImage: '' }
}

app.get('/', async (c) => {
  const BASE_PATH = Bun.env.LANCACHE_LOGS_PATH
  return c.json(await parseLogFile(`${BASE_PATH}/access.log`) satisfies Stats)
})

export default app
