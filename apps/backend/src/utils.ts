import { ansiColorFormatter, configureSync, getConsoleSink, getLogger } from "@logtape/logtape";
import { Container } from "shared/types";
import { docker } from "./docker";

const logger = getLogger(['lancache-manager']);

export const configureLogger = async () => {
  configureSync({
    sinks: { console: getConsoleSink({ formatter: ansiColorFormatter }) },
    loggers: [
      { category: ["logtape", "meta"], sinks: [] },
      { category: "lancache-manager", lowestLevel: "debug", sinks: ["console"] }
    ],
  });
}

export const populateContainerWithLog = (_container: Container, log: string): Container => {
  const container = { ..._container }

  let match = log.match(/Downloading..:\s(\d+)%/)
  if (match){
    container.isDownloading = true
    container.downloadPercent = parseInt(match[1])
  }

  return container
}

export const getContainerSettingsFromTag = (tag: string): { configPath: string, containerName: string } => {
  const BASE_CONFIGS_PATH = process.env.CONFIGS_PATH
  let path = 'unsorted'

  switch (tag) {
    case 'tsecretino/steam-lancache-prefill-raspi':
      path = 'steam'; break;
    case 'tsecretino/epic-lancache-prefill-raspi':
      path = 'epic'; break;
    case 'tsecretino/battlenet-lancache-prefill-raspi':
      path = 'battlenet'; break;
    default:
      path = 'steam'
  }

  return { configPath: BASE_CONFIGS_PATH + `/${path}/config`, containerName: `lancache-${path}-prefill`  }
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

  logger.info('Checking for updates')

  const images = await docker.imageList()
  for (const image of images){
    if (!image.isPulled){
      logger.warn(`Skipping ${image.tag} because it is not pulled`)
      continue
    }

    logger.info(`Checking updates for ${image.tag}`)
    await docker.containerRun(image.tag)
  }

  logger.info('Check complete')
  return true
}

export const isAllowedToDownload = (): boolean => {
  return true
}
