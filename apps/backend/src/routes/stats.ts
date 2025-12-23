import { Hono } from 'hono'
import { ActiveDownload, Download, RedisDepot, Services, Stats } from 'shared/types'
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { redis } from 'bun';
import { rm } from "node:fs/promises";
import { getLogger } from '@logtape/logtape';
import { getBattlenetAppName } from '../utils';
import { createHash } from 'node:crypto';

dayjs.extend(customParseFormat);

const app = new Hono()
const REGEX = /\[(\w+)] (\d+.\d+.\d+.\d+) \/ - - - \[(.*)] "GET (.*) HTTP\/1.1" (\d+) (\d+) "(.*)" "(.*)" "(.*)" "(.*)" "(.*)"/
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

    const [, service, ip, datetime, endpoint, statusCode, byte, client, headers, result, host] = match

    if (!statusCode.startsWith('20')) continue

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

        result === 'HIT' ? stats.reuses.push(app): stats.downloads.push(app)

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

        result === 'HIT' ? stats.reuses.push(app): stats.downloads.push(app)

        active[service][appId] = {
          startedAt: timestamp,
          startedAtString: datetime,
          lastSeen: timestamp,
          bytesDownloaded: parseInt(byte),
          depots: []
        }
      }
    }

    if (service === 'riot'){
      const appId = host.split('.')[0]

      if (!(appId in active[service])) {
        active[service][appId] = {
          startedAt: timestamp,
          startedAtString: datetime,
          lastSeen: timestamp,
          bytesDownloaded: 0,
          depots: [game]
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

        result === 'HIT' ? stats.reuses.push(app): stats.downloads.push(app)

        active[service][appId] = {
          startedAt: timestamp,
          startedAtString: datetime,
          lastSeen: timestamp,
          bytesDownloaded: parseInt(byte),
          depots: []
        }
      }
    }

    if (service === 'wsus'){
      const appId = 'Windows'

      if (!(appId in active[service])) {
        active[service][appId] = {
          startedAt: timestamp,
          startedAtString: datetime,
          lastSeen: timestamp,
          bytesDownloaded: 0,
          depots: [game]
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

        result === 'HIT' ? stats.reuses.push(app): stats.downloads.push(app)

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

const getGameLogs = (logs: string[], type: 'reuse' | 'download', service: string, startedAtString: string, depots: string[]): Set<string> => {

  const set = new Set<string>()
  let lastSeenTimestamp: number | null = null

  for (const log of logs) {
    const match = log.match(REGEX)
    if (!match) continue

    const [, _service, ip, datetime, endpoint, statusCode, byte, client, headers, _result, host] = match
    if (service !== _service || !(type === 'download' ? (_result === 'MISS' || _result === 'BYPASS') : _result === 'HIT') ) continue

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

  const appLogs = getGameLogs(logs, 'reuse', body.service, body.startedAtString, body.depots)
  await deleteLogs(logs, appLogs)

  return c.json({ deletedLines: appLogs.size })
})

app.delete('/download', async (c) => {
  const body = await c.req.json()
  const PATH = `${Bun.env.LANCACHE_LOGS_PATH}/access.log`

  const text = await readLogFile(PATH)
  const logs = text.split('\n')

  const appLogs = getGameLogs(logs, 'download', body.service, body.startedAtString, body.depots)

  const promises = []
  const paths: string[] = []

  for (const log of appLogs.values()){

    const match = log.match(REGEX)
    if (!match) continue
    const [, service, ip, datetime, endpoint, statusCode, _totalSize, client, headers, result, host, byteRange] = match

    const SLICE_SIZE = 1024 * 1024
    const totalSize = parseInt(_totalSize)

    const ranges: [number, number][] = []


    if (byteRange !== '-'){
      const lower = parseInt(byteRange.split('=')[1].split('-')[0])
      const upper = parseInt(byteRange.split('=')[1].split('-')[1])

      let start = lower
      let end = upper

      start = Math.floor(start / SLICE_SIZE) * SLICE_SIZE

      while (start <= end){
        const segmentEnd = start + SLICE_SIZE - 1
        ranges.push([start, segmentEnd])
        start += SLICE_SIZE
      }
    } else {
      if (totalSize === 0) {
        ranges.push([0, SLICE_SIZE-1])
      } else {
        for (let start = 0; start < totalSize; start += SLICE_SIZE) {
          let end = start + SLICE_SIZE - 1
          if (end >= totalSize){
            end = start + SLICE_SIZE - 1
          }
          ranges.push([start, end])
        }
      }
    }


    for (const range of ranges){
      const input = service + endpoint + `bytes=${range[0]}-${range[1]}`

      const hash = createHash("md5").update(input).digest("hex")

      const path = `${hash.slice(-2)}/${hash.slice(-4, -2)}/${hash}`
      paths.push(path)
      promises.push(rm(`${Bun.env.LANCACHE_CACHE_PATH}/cache/${path}`, { force: true }))
    }
  }

  await Promise.all(promises)
  await deleteLogs(logs, appLogs)

  return c.json({ deletedLines: appLogs.size, paths })
})

export default app
