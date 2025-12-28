import { getLogger } from '@logtape/logtape';
import { fetch, redis } from 'bun';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { Hono } from 'hono';
import { ActiveDownload, CachedApp, Download, Stats, type Service } from 'shared/types';

dayjs.extend(customParseFormat);

const app = new Hono()
const REGEX = /\[(\w+)] (\d+.\d+.\d+.\d+) \/ - - - \[(.*)] "GET (.*) HTTP\/1.1" (\d+) (\d+) "(.*)" "(.*)" "(.*)" "(.*)" "(.*)"/
const TIME_FORMAT = "DD/MMM/YYYY:HH:mm:ss Z";
const LAST_SEEN_DIFF = 3 * 60 * 1000

const logger = getLogger(['lancache-manager']);

export function getLogPath(): string {
  return `${Bun.env.LANCACHE_LOGS_PATH}/access.log`
}

export async function* readLogFile(filePath: string){
    const reader = Bun.file(filePath).stream().pipeThrough(new TextDecoderStream('utf-8')).getReader()

    let remainder = ''
    while(true) {
        const {value, done} = await reader.read()
        if(done) break
        let lines = (remainder + value).split(/\r?\n/)
        remainder = lines.pop()!

        for(const line of lines) {
            yield line
        }
    }

    if(remainder) {
        yield remainder
    }
}

export async function parseLogFile(): Promise<Stats> {
  const PATH = getLogPath()
  console.log('PATH', PATH)
  const STEAM_DEPOT_MAP: Record<string, CachedApp> = {}

  const stats: Stats = {
    bytesDownloaded: 0,
    bytesReused: 0,
    downloads: [],
    reuses: []
  }

  let activeDownloads: Record<string, Record<string, ActiveDownload>> = {}
  let activeReuses: Record<string, Record<string, ActiveDownload>> = {}


  for await (const line of readLogFile(PATH)) {
    const match = line.match(REGEX)

    if (!match) continue

    const [, service, ip, datetime, endpoint, statusCode, byte, client, headers, result, host] = match

    if (!statusCode.startsWith('20')) continue

    if (result === 'MISS' || result === 'BYPASS')
      stats.bytesDownloaded += parseInt(byte)

    if (result === 'HIT')
      stats.bytesReused += parseInt(byte)

    const parsedDate = dayjs(datetime, TIME_FORMAT);
    const timestamp = parsedDate.valueOf();

    const active = result === 'MISS' || result === 'BYPASS' ? activeDownloads : activeReuses

    if (!(service in active))
      active[service] = {}

    if (service === 'steam') {
      const depotId = endpoint.split('/')[2]

      if (!(depotId in STEAM_DEPOT_MAP)) {
        const depot = await getAppData(service, depotId)
        STEAM_DEPOT_MAP[depotId] = depot
      }

      const appId = STEAM_DEPOT_MAP[depotId].appId

      if (!(appId in active[service])) {
        active[service][appId] = {
          startedAt: timestamp,
          startedAtString: datetime,
          lastSeen: timestamp,
          bytesDownloaded: 0,
          depots: [depotId]
        } satisfies ActiveDownload
      }

      if (timestamp - active[service][appId].lastSeen < LAST_SEEN_DIFF) {
        active[service][appId].lastSeen = timestamp
        active[service][appId].bytesDownloaded += parseInt(byte)
        if (!active[service][appId].depots.includes(depotId)) active[service][appId].depots.push(depotId)
      } else {
        const app = {
          startedAt: active[service][appId].startedAt,
          startedAtString: active[service][appId].startedAtString,
          endedAt: active[service][appId].lastSeen,
          bytesDownloaded: active[service][appId].bytesDownloaded,
          service: service,
          app: appId.toString(),
          appImage: STEAM_DEPOT_MAP[depotId].appImage,
          appName: STEAM_DEPOT_MAP[depotId].appName,
          depots: active[service][appId].depots
        } as Download

        result === 'MISS' ? stats.downloads.push(app) : stats.reuses.push(app)

        active[service][appId] = {
          startedAt: timestamp,
          startedAtString: datetime,
          lastSeen: timestamp,
          bytesDownloaded: parseInt(byte),
          depots: [depotId]
        }
      }
    }

    if (service === 'epicgames') {

      let appId = ''

      if (endpoint.split('/')[2] === 'Org'){
        appId = endpoint.split('/')[4]
      } else {
        switch (endpoint.split('/')[2]){
          case 'Fortnite':
            appId = 'prod-fn'
        }
      }

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
        const appData = await getAppData(service, appId)
        const app = {
          startedAt: active[service][appId].startedAt,
          startedAtString: active[service][appId].startedAtString,
          endedAt: active[service][appId].lastSeen,
          bytesDownloaded: active[service][appId].bytesDownloaded,
          service: service,
          app: appId,
          appImage: appData.appImage,
          appName: appData.appName,
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
      const appId = endpoint.split('/')[2]

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
        const appData = await getAppData(service, appId)
        const app = {
          startedAt: active[service][appId].startedAt,
          startedAtString: active[service][appId].startedAtString,
          endedAt: active[service][appId].lastSeen,
          bytesDownloaded: active[service][appId].bytesDownloaded,
          service: service,
          app: appId,
          appImage: appData.appImage,
          appName: appData.appName,
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
          depots: []
        } satisfies ActiveDownload
      }

      if (timestamp - active[service][appId].lastSeen < LAST_SEEN_DIFF){
        active[service][appId].lastSeen = timestamp
        active[service][appId].bytesDownloaded += parseInt(byte)
      } else {
        const appData = await getAppData(service, appId)
        const app = {
          startedAt: active[service][appId].startedAt,
          startedAtString: active[service][appId].startedAtString,
          endedAt: active[service][appId].lastSeen,
          bytesDownloaded: active[service][appId].bytesDownloaded,
          service: service,
          app: appId,
          appImage: appData.appImage,
          appName: appData.appName,
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
          depots: []
        } satisfies ActiveDownload
      }

      if (timestamp - active[service][appId].lastSeen < LAST_SEEN_DIFF){
        active[service][appId].lastSeen = timestamp
        active[service][appId].bytesDownloaded += parseInt(byte)
      } else {
        const appData = await getAppData(service, appId)
        const app = {
          startedAt: active[service][appId].startedAt,
          startedAtString: active[service][appId].startedAtString,
          endedAt: active[service][appId].lastSeen,
          bytesDownloaded: active[service][appId].bytesDownloaded,
          service: service,
          app: appId,
          appImage: appData.appImage,
          appName: appData.appName,
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
    for (const appId in activeDownloads[service]) {

      if (service === 'steam'){
        let depotId = ''
        for (const _depotId in STEAM_DEPOT_MAP) {
          if (STEAM_DEPOT_MAP[_depotId].appId.toString() === appId) {
            depotId = _depotId
            break
          }
        }

        stats.downloads.push({
          startedAt: activeDownloads[service][appId].startedAt,
          startedAtString: activeDownloads[service][appId].startedAtString,
          endedAt: activeDownloads[service][appId].lastSeen,
          bytesDownloaded: activeDownloads[service][appId].bytesDownloaded,
          service,
          app: appId,
          appImage: STEAM_DEPOT_MAP[depotId].appImage,
          appName: STEAM_DEPOT_MAP[depotId].appName,
          depots: activeDownloads[service][appId].depots
        })
      } else {
        const app = await getAppData(service as Service, appId)

        stats.downloads.push({
          startedAt: activeDownloads[service][appId].startedAt,
          startedAtString: activeDownloads[service][appId].startedAtString,
          endedAt: activeDownloads[service][appId].lastSeen,
          bytesDownloaded: activeDownloads[service][appId].bytesDownloaded,
          service,
          app: appId,
          appImage: app.appImage,
          appName: app.appName,
          depots: []
        })
      }


    }
  }

  for (const service in activeReuses) {
    for (const appId in activeReuses[service]) {

      if (service === 'steam'){
        let depotId = ''
        for (const _depotId in STEAM_DEPOT_MAP) {
          if (STEAM_DEPOT_MAP[_depotId].appId.toString() === appId) {
            depotId = _depotId
            break
          }
        }

        stats.reuses.push({
          startedAt: activeReuses[service][appId].startedAt,
          startedAtString: activeReuses[service][appId].startedAtString,
          endedAt: activeReuses[service][appId].lastSeen,
          bytesDownloaded: activeReuses[service][appId].bytesDownloaded,
          service,
          app: appId,
          appImage: STEAM_DEPOT_MAP[depotId].appImage,
          appName: STEAM_DEPOT_MAP[depotId].appName,
          depots: activeReuses[service][appId].depots
        })
      } else {
        const app = await getAppData(service as Service, appId)

        stats.reuses.push({
          startedAt: activeReuses[service][appId].startedAt,
          startedAtString: activeReuses[service][appId].startedAtString,
          endedAt: activeReuses[service][appId].lastSeen,
          bytesDownloaded: activeReuses[service][appId].bytesDownloaded,
          service,
          app: appId,
          appImage: app.appImage,
          appName: app.appName,
          depots: []
        })
      }
    }
  }

  stats.downloads.sort((a, b) => b.startedAt - a.startedAt);
  stats.reuses.sort((a, b) => b.startedAt - a.startedAt);

  return stats
}

const getAppData = async (service: Service, appId: string): Promise<CachedApp> => {
  const cached = await redis.get(`apps:${service}:${appId}`)

  if (cached)
    return JSON.parse(cached)


  let app = { appId: "0", appName: "Unknown", appImage: '' }
  let res;
  switch (service) {
    case 'epicgames':
      res = await fetch(`https://egs-platform-service.store.epicgames.com/api/v1/egs/products/${appId}?country=US&locale=en-US&store=EGS`)
      if (res.status === 200){
        const { title, media: { card16x9: { imageSrc: imageUrl} } } = await res.json()
        app = { appId, appName: title, appImage: imageUrl }
      }
      await redis.set(`apps:${service}:${appId}`, JSON.stringify(app))
      break;
    case 'blizzard':
      if (appId === 'hs') appId = 'hsb'
      res = await fetch(`https://blizztrack.com/api/manifest/${appId}/cdns`)
      if (res.status === 200){
        const { result: { name } } = await res.json()
        app = { appId, appName: name, appImage: '' }
      }
      await redis.set(`apps:${service}:${appId}`, JSON.stringify(app))
      break;
    case 'riot':
      return { appId, appName: appId === 'valorant' ? 'Valorant' : 'Unknown', appImage: '' }
    case 'wsus':
      return { appId, appName: 'Windows Update', appImage : '' }
  }

  return app
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
    const PATH = getLogPath()
    logger.info(`Deleting ${appLogs.size} log lines`)
    await Bun.write(PATH, logs.filter(log => !appLogs.has(log)).join('\n'))
}

app.get('/', async (c) => {
  return c.json(await parseLogFile() satisfies Stats)
})

app.delete('/reuse', async (c) => {
  // const body = await c.req.json()

  // const appLogs = getGameLogs(logs, 'reuse', body.service, body.startedAtString, body.depots)
  // await deleteLogs(logs, appLogs)

  // return c.json({ deletedLines: appLogs.size })
})

app.delete('/download', async (c) => {
  // const body = await c.req.json()
  // const PATH = `${Bun.env.LANCACHE_LOGS_PATH}/access.log`

  // const text = await readLogFile(PATH)
  // const logs = text.split('\n')

  // const appLogs = getGameLogs(logs, 'download', body.service, body.startedAtString, body.depots)

  // const promises = []
  // const paths: string[] = []

  // for (const log of appLogs.values()){

  //   const match = log.match(REGEX)
  //   if (!match) continue
  //   const [, service, ip, datetime, endpoint, statusCode, _totalSize, client, headers, result, host, byteRange] = match

  //   const SLICE_SIZE = 1024 * 1024
  //   const totalSize = parseInt(_totalSize)

  //   const ranges: [number, number][] = []


  //   if (byteRange !== '-'){
  //     const lower = parseInt(byteRange.split('=')[1].split('-')[0])
  //     const upper = parseInt(byteRange.split('=')[1].split('-')[1])

  //     let start = lower
  //     let end = upper

  //     start = Math.floor(start / SLICE_SIZE) * SLICE_SIZE

  //     while (start <= end){
  //       const segmentEnd = start + SLICE_SIZE - 1
  //       ranges.push([start, segmentEnd])
  //       start += SLICE_SIZE
  //     }
  //   } else {
  //     if (totalSize === 0) {
  //       ranges.push([0, SLICE_SIZE-1])
  //     } else {
  //       for (let start = 0; start < totalSize; start += SLICE_SIZE) {
  //         let end = start + SLICE_SIZE - 1
  //         if (end >= totalSize){
  //           end = start + SLICE_SIZE - 1
  //         }
  //         ranges.push([start, end])
  //       }
  //     }
  //   }


  //   for (const range of ranges){
  //     const input = service + endpoint + `bytes=${range[0]}-${range[1]}`

  //     const hash = createHash("md5").update(input).digest("hex")

  //     const path = `${hash.slice(-2)}/${hash.slice(-4, -2)}/${hash}`
  //     paths.push(path)
  //     promises.push(rm(`${Bun.env.LANCACHE_CACHE_PATH}/cache/${path}`, { force: true }))
  //   }
  // }

  // await Promise.all(promises)
  // await deleteLogs(logs, appLogs)

  // return c.json({ deletedLines: appLogs.size, paths })
})

export default app
