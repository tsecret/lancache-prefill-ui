import { Hono } from 'hono'
import { ActiveDownload, Download, RedisDepot, Services, Stats } from 'shared/types'
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { redis } from 'bun';
import { rm } from "node:fs/promises";
import { getLogger } from '@logtape/logtape';
import { getBattlenetAppName } from '../utils';

dayjs.extend(customParseFormat);

const app = new Hono()
const REGEX = /\[(\w+)] (\d+.\d+.\d+.\d+) \/ - - - \[(.*)] "GET (.*) HTTP\/1.1" (\d+) (\d+) "-" "(.*)" "(\w+)" "(.*)" "(.*)"/
const TIME_FORMAT = "DD/MMM/YYYY:HH:mm:ss Z";
const LAST_SEEN_DIFF = 3 * 60 * 1000

const logger = getLogger(['lancache-manager']);

function endpointParse(service: Services, endpoint: string) {
  switch (service) {
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

  for (const line of logs) {
    const match = line.match(REGEX)

    if (!match) continue

    const [, service, ip, datetime, endpoint, statusCode, byte, client, result, host] = match

    if (statusCode !== '200') continue

    if (result === 'MISS' || result === 'BYPASS')
      stats.bytesDownloaded += parseInt(byte)

    if (result === 'HIT')
      stats.bytesReused += parseInt(byte)

    const { game, hash } = endpointParse(service as Services, endpoint)
    const parsedDate = dayjs(datetime, TIME_FORMAT);
    const timestamp = parsedDate.valueOf();

    const active = result === 'MISS' || result === 'BYPASS' ? activeDownloads : activeReuses

    if (!(service in active))
      active[service] = {}

    if (service === 'steam') {
      // here game is depot

      if (!(game in STEAM_DEPOT_MAP)) {
        const depot = await getAppFromDepot(game)
        STEAM_DEPOT_MAP[game] = depot
      }

      const appId = STEAM_DEPOT_MAP[game].appId

      if (!(appId in active[service])) {
        active[service][appId] = {
          startedAt: timestamp,
          startedAtString: datetime,
          lastSeen: timestamp,
          bytesDownloaded: 0,
          depots: [game]
        } satisfies ActiveDownload
      }

      if (timestamp - active[service][appId].lastSeen < LAST_SEEN_DIFF) {
        active[service][appId].lastSeen = timestamp
        active[service][appId].bytesDownloaded += parseInt(byte)
        if (!active[service][appId].depots.includes(game)) active[service][appId].depots.push(game)
      } else {
        const app = {
          startedAt: active[service][appId].startedAt,
          startedAtString: active[service][appId].startedAtString,
          endedAt: active[service][appId].lastSeen,
          bytesDownloaded: active[service][appId].bytesDownloaded,
          service: service,
          app: appId.toString(),
          appImage: STEAM_DEPOT_MAP[game].appImage,
          appName: STEAM_DEPOT_MAP[game].appName,
          depots: active[service][appId].depots
        } as Download

        result === 'MISS' ? stats.downloads.push(app) : stats.reuses.push(app)

        active[service][appId] = {
          startedAt: timestamp,
          startedAtString: datetime,
          lastSeen: timestamp,
          bytesDownloaded: parseInt(byte),
          depots: [game]
        }
      }
    }

    if (service === 'epicgames') {
      const [, , appId] = endpoint.split('/')

      if (!(appId in active[service])){
        active[service][appId] = {
          startedAt: timestamp,
          startedAtString: datetime,
          lastSeen: timestamp,
          bytesDownloaded: 0,
          depots: []
        } satisfies ActiveDownload
      }

      if (timestamp - active[service][appId].lastSeen < LAST_SEEN_DIFF){
        active[service][appId].lastSeen = timestamp
        active[service][appId].bytesDownloaded += parseInt(byte)
      } else {
        const app = {
          startedAt: active[service][appId].startedAt,
          startedAtString: active[service][appId].startedAtString,
          endedAt: active[service][appId].lastSeen,
          bytesDownloaded: active[service][appId].bytesDownloaded,
          service: service,
          app: appId,
          appImage: "",
          appName: appId,
          depots: []
        } as Download

        result === 'MISS' ? stats.downloads.push(app) : stats.reuses.push(app)

        active[service][appId] = {
          startedAt: timestamp,
          startedAtString: datetime,
          lastSeen: timestamp,
          bytesDownloaded: parseInt(byte),
          depots: []
        }
      }
    }

    if (service === 'blizzard') {
      const [, , appId] = endpoint.split('/')

      if (!(appId in active[service])){
        active[service][appId] = {
          startedAt: timestamp,
          startedAtString: datetime,
          lastSeen: timestamp,
          bytesDownloaded: 0,
          depots: []
        } satisfies ActiveDownload
      }

      if (timestamp - active[service][appId].lastSeen < LAST_SEEN_DIFF){
        active[service][appId].lastSeen = timestamp
        active[service][appId].bytesDownloaded += parseInt(byte)
      } else {
        const app = {
          startedAt: active[service][appId].startedAt,
          startedAtString: active[service][appId].startedAtString,
          endedAt: active[service][appId].lastSeen,
          bytesDownloaded: active[service][appId].bytesDownloaded,
          service: service,
          app: appId,
          appImage: "",
          appName: getBattlenetAppName(appId),
          depots: []
        } as Download

        result === 'MISS' ? stats.downloads.push(app) : stats.reuses.push(app)

        active[service][appId] = {
          startedAt: timestamp,
          startedAtString: datetime,
          lastSeen: timestamp,
          bytesDownloaded: parseInt(byte),
          depots: []
        }
      }
    }

  }

  for (const service in activeDownloads) {
    for (const app in activeDownloads[service]) {

      if (service === 'steam'){
        let depot = ''
        for (const _depot in STEAM_DEPOT_MAP) {
          if (STEAM_DEPOT_MAP[_depot].appId.toString() === app) {
            depot = _depot
            break
          }
        }

        stats.downloads.push({
          startedAt: activeDownloads[service][app].startedAt,
          startedAtString: activeDownloads[service][app].startedAtString,
          endedAt: activeDownloads[service][app].lastSeen,
          bytesDownloaded: activeDownloads[service][app].bytesDownloaded,
          service,
          app: app,
          appImage: STEAM_DEPOT_MAP[depot].appImage,
          appName: STEAM_DEPOT_MAP[depot].appName,
          depots: activeDownloads[service][app].depots
        })
      } else {
        stats.downloads.push({
          startedAt: activeDownloads[service][app].startedAt,
          startedAtString: activeDownloads[service][app].startedAtString,
          endedAt: activeDownloads[service][app].lastSeen,
          bytesDownloaded: activeDownloads[service][app].bytesDownloaded,
          service,
          app: app,
          appImage: "",
          appName: service === 'blizzard' ? getBattlenetAppName(app) : app,
          depots: []
        })
      }


    }
  }

  for (const service in activeReuses) {
    for (const app in activeReuses[service]) {

      if (service === 'steam'){
        let depot = ''
        for (const _depot in STEAM_DEPOT_MAP) {
          if (STEAM_DEPOT_MAP[_depot].appId.toString() === app) {
            depot = _depot
            break
          }
        }

        stats.reuses.push({
          startedAt: activeReuses[service][app].startedAt,
          startedAtString: activeReuses[service][app].startedAtString,
          endedAt: activeReuses[service][app].lastSeen,
          bytesDownloaded: activeReuses[service][app].bytesDownloaded,
          service,
          app: app,
          appImage: STEAM_DEPOT_MAP[depot].appImage,
          appName: STEAM_DEPOT_MAP[depot].appName,
          depots: activeReuses[service][app].depots
        })
      } else {
        stats.reuses.push({
          startedAt: activeReuses[service][app].startedAt,
          startedAtString: activeReuses[service][app].startedAtString,
          endedAt: activeReuses[service][app].lastSeen,
          bytesDownloaded: activeReuses[service][app].bytesDownloaded,
          service,
          app: app,
          appImage: "",
          appName: service === 'blizzard' ? getBattlenetAppName(app) : app,
          depots: []
        })
      }
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

const getGameLogs = (logs: string[], result: 'HIT' | 'MISS', service: string, startedAtString: string, depots: string[]): Set<string> => {

  const set = new Set<string>()
  let lastSeenTimestamp: number | null = null

  for (const log of logs) {
    const match = log.match(REGEX)
    if (!match) continue

    const [, _service, ip, datetime, endpoint, statusCode, byte, client, _result, host] = match
    if (service !== _service || _result !== result) continue

    if (!lastSeenTimestamp && datetime === startedAtString){
      lastSeenTimestamp = dayjs(datetime, TIME_FORMAT).valueOf();
    }

    if (!lastSeenTimestamp) continue

    const logTimestamp = dayjs(datetime, TIME_FORMAT).valueOf();

    if (logTimestamp - lastSeenTimestamp <= LAST_SEEN_DIFF){
      lastSeenTimestamp = logTimestamp
      set.add(log)
    } else {
      break
    }

  }

  return set
}

const deleteLogs = async (logs: string[], appLogs: Set<string>) => {
    const PATH = `${Bun.env.LANCACHE_LOGS_PATH}/access.log`
    logger.info(`Deleting ${appLogs.size} log lines`)
    await Bun.write(PATH, logs.filter(log => !appLogs.has(log)).join('\n'))
}

app.get('/', async (c) => {
  return c.json(await parseLogFile() satisfies Stats)
})

app.delete('/reuse', async (c) => {
  const body = await c.req.json()
  const PATH = `${Bun.env.LANCACHE_LOGS_PATH}/access.log`

  const text = await readLogFile(PATH)
  const logs = text.split('\n')

  const appLogs = getGameLogs(logs, 'HIT', body.service, body.startedAtString, body.depots)
  await deleteLogs(logs, appLogs)

  return c.json({ deletedLines: appLogs.size })
})

// app.delete('/download', async (c) => {
//   const body = await c.req.json()
//   const PATH = `${Bun.env.LANCACHE_LOGS_PATH}/access.log`

//   const text = await readLogFile(PATH)
//   const logs = text.split('\n')

//   const appLogs = getGameLogs(logs, 'MISS', body.service, body.startedAtString, body.depots)

//   let promises = []
//   for (const log of appLogs.values()){

//     const match = log.match(REGEX)
//     if (!match) continue
//     const [, service, ip, datetime, endpoint, statusCode, byte, client, result, host] = match

//     if (service === 'steam'){
//       const hash = endpoint.split('/')[4]
//       promises.push(rm(`${Bun.env.LANCACHE_CACHE_PATH}/cache/${hash.slice(0, 2)}/${hash.slice(2, 4)}`, { recursive: true, force: true }))
//     }

//   }

//   await Promise.all(promises)
//   await deleteLogs(logs, appLogs)

//   return c.json({ deletedLines: appLogs.size })
// })

export default app
