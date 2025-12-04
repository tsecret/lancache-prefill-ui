import { ansiColorFormatter, configureSync, getConsoleSink, getLogger } from "@logtape/logtape";
import { Container, ImageTag, Settings } from "shared/types";
import { docker } from "./clients/docker";

const logger = getLogger(['lancache-manager']);

export const loadSettings = async (): Promise<Settings> => {
  return Bun.file(process.env.CONFIGS_PATH + '/settings.json').json()
}

export const saveSettings = async (settings: Settings): Promise<void> => {
  await Bun.file(process.env.CONFIGS_PATH + '/settings.json').write(JSON.stringify(settings))
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

export const populateContainerWithLog = (_container: Container, log: string): Container => {
  const container = { ..._container }

  let match = log.match(/(\d+)%\s+(\d+:\d+:\d+)\s+(\d+.\d)\/(\d+.\d)\s+(.*)\s+(\d+.\d+)\s(.*)/)
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

export const check = async (): Promise<boolean> => {

  if (!isAllowedToDownload()){
    logger.warn('Download now allowed, skipping check')
    return false
  }

  const containers = await docker.containerList()
  if (containers.length){
    logger.warn('Prefill container already exists, skipping')
    return false
  }

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
  return true
}

export const isAllowedToDownload = async (): Promise<boolean> => {
  const settings = await loadSettings()
  return settings.cron.enabled
}
