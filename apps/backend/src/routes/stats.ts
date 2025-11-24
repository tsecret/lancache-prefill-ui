import { Hono } from 'hono'
import { Services, Stats } from 'shared/types'

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
  const foo = Bun.file(filePath);

  const log = await foo.text()
  const logs = log.split('\n')

  const stats: Stats = {
    bytesDownloaded: 0
  }

  const services: Record<Services, Record<string, Stats>> = {
    steam: {},
    epic: {},
    battlenet: {},
  }

  for (const line of logs){
    const match = line.match(REGEX)
    if (match) {
      const [, service, ip, datetime, endpoint, statusCode, byte, client, result, host] = match

      stats.bytesDownloaded += parseInt(byte)

      const { game, hash } = endpointParse(service as Services, endpoint)

      console.log('service, endpoint', service, endpoint)
    }
  }

  return stats
}

const prettyBytes = (num: number, precision = 3, addSpace = true) => {
  const UNITS = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  if (Math.abs(num) < 1) return num + (addSpace ? " " : "") + UNITS[0];
  const exponent = Math.min(
    Math.floor(Math.log10(num < 0 ? -num : num) / 3),
    UNITS.length - 1
  );
  const n = Number(
    ((num < 0 ? -num : num) / 1000 ** exponent).toPrecision(precision)
  );
  return (num < 0 ? "-" : "") + n + (addSpace ? " " : "") + UNITS[exponent];
};

app.get('/', async (c) => {
  const BASE_PATH = Bun.env.LANCACHE_LOGS_PATH
  return c.json(await parseLogFile(`${BASE_PATH}/access.log`) satisfies Stats)
})

export default app
