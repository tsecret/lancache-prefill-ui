import { ansiColorFormatter, configureSync, getConsoleSink, getLogger } from "@logtape/logtape";
import { Container, ImageTag, Settings } from "shared/types";
import { docker } from "./clients/docker";

const logger = getLogger(['lancache-manager']);

export const loadSettings = async (): Promise<Settings> => {
  return Bun.file(Bun.env.SETTINGS_PATH || Bun.env.CONFIGS_PATH + '/settings.json').json()
}

export const saveSettings = async (settings: Settings): Promise<void> => {
  await Bun.file(Bun.env.SETTINGS_PATH || Bun.env.CONFIGS_PATH + '/settings.json').write(JSON.stringify(settings, null, 2))
}

export const configureLogger = async () => {
  configureSync({
    sinks: { console: getConsoleSink({ formatter: ansiColorFormatter }) },
    loggers: [
      { category: ["logtape", "meta"], sinks: [] },
      { category: "lancache-manager", lowestLevel: "debug", sinks: ["console"] }
    ],
  });
}

export const sleep = async (ms: number = 2000) => {
  await new Promise(res => setTimeout(res, ms))
}

export const populateContainerWithLog = (_container: Container, logs: string[]): Container => {
  const container = { ..._container }

  // Game
  for (let i = logs.length-1; i >= 0; i--){
    if (!logs[i].includes('Starting')) continue
    const match = logs[i].match(/Starting (.*)/)
    if (match){
      container.gameName = match[1]
      break
    }
  }

  // Download status
  if (logs.length < 2) return container
  let match = logs[logs.length-2].match(/(\d+)%\s+(\d+:\d+:\d+)\s+(\d+.\d)\/(\d+.\d)\s+(.*)\s+(\d+.\d+)\s(.*)/)
  if (match){
    const [, percent, time, downloadedAmount, downloadLeftAmount, unitAmount, speed, unitSpeed] = match

    container.progress = {
      isDownloading: true,
      percent: parseInt(percent),
      time,
      downloadedAmount: parseFloat(downloadedAmount),
      downloadLeftAmount: parseFloat(downloadLeftAmount),
      unitAmount,
      speed: parseFloat(speed),
      unitSpeed
    }
  } else {
    if (logs[logs.length-2])
      container.lastLog = logs[logs.length-2]
  }


  return container
}

export const getContainerSettingsFromTag = (tag: ImageTag): { configPath: string, cachePath: string, containerName: string } => {
  const BASE_CONFIGS_PATH = process.env.CONFIGS_PATH
  let path = 'unsorted'

  switch (tag) {
    case ImageTag.STEAM:
      path = 'steam'; break;
    case ImageTag.EPIC:
      path = 'epic'; break;
    case ImageTag.BATTLENET:
      path = 'battlenet'; break;
    default:
      path = 'steam'
  }

  return {
    configPath: BASE_CONFIGS_PATH + `/${path}/config`,
    cachePath: BASE_CONFIGS_PATH + `/cache`,
    containerName: `lancache-${path}-prefill`
  }
}

export const check = async (): Promise<void> => {


  logger.info('Checking process started');

  (async () => {
    const images = await docker.imageList()
    for (const image of images){
      if (!image.isPulled){
        logger.warn(`Skipping ${image.tag} because it is not pulled`)
        continue
      }

      logger.info(`Checking updates for ${image.tag}`)
      await docker.containerRun(image.tag)
    }

  })();

  logger.info('Check complete')
}

export const isAllowedToDownload = (settings: Settings): boolean => {
  if (!settings.check.enabled)
    return false

  const currentDate = new Date()

  return settings.check.enabled &&
    settings.restriction.enabled ?
      (
        settings.restriction.allowedTimeWindow[0] < settings.restriction.allowedTimeWindow[1] ?
          currentDate.getHours() >= settings.restriction.allowedTimeWindow[0] && currentDate.getHours() <= settings.restriction.allowedTimeWindow[1] :
          currentDate.getHours() <= settings.restriction.allowedTimeWindow[1] || currentDate.getHours() >= settings.restriction.allowedTimeWindow[0]
      ) :
    true
}

export const getBattlenetAppName = (appId: string): string => {
  switch (appId) {
    case 'hs':
      return 'Hearthstone'
    case 'pro':
      return 'Overwatch'
    default:
      return 'Unknown Game'
  }
}
