import { getLogger } from '@logtape/logtape';
import { fetch, redis } from 'bun';
import { Hono } from 'hono';
import cron from 'node-cron';
import { RedisDepot } from 'shared/types';
import containers from './routes/containers';
import devices from './routes/devices';
import games from './routes/games';
import images from './routes/images';
import settings from './routes/settings';
import stats from './routes/stats';
import { check, configureLogger, loadSettings } from './utils';

configureLogger()
const app = new Hono()
const logger = getLogger(['lancache-manager']);

app.get('/', (c) => {
  return c.text('ok')
})

app.post('/api/check', async (c) => {
  const checked = await check();
  return c.json(checked)
})

app.route('/api/containers', containers)
app.route('/api/images', images)
app.route('/api/games', games)
app.route('/api/stats', stats)
app.route('/api/devices', devices)
app.route('/api/settings', settings);

(async () => {
  const settings = await loadSettings()

  logger.info(`Check cron job: ${settings.check.cron}`)
  cron.schedule(settings.check.cron, async () => {
    await check()
  });
})();

(async () => {

  const lastCheckS = await redis.get('depot:check_timestamp')
  const lastCheck = parseInt(lastCheckS || '0')

  if (+new Date() - lastCheck < 24 * 60 * 60 * 1000)
    return

  logger.info('Loading depots')
  const res = await fetch('https://raw.githubusercontent.com/regix1/lancache-pics/refs/heads/main/output/pics_depot_mappings.json')
  const mapping = await res.json()

  await Promise.all(Object.keys(mapping.depotMappings).map(depot => redis.set(`depot:${depot}`, JSON.stringify({
    appId: mapping.depotMappings[depot].ownerId,
    appName: mapping.depotMappings[depot].appNames[0],
    appImage: mapping.depotMappings[depot].appHeaderImages[0],
  } satisfies RedisDepot))))
  await redis.set('depot:check_timestamp', (+new Date()).toString())
  logger.info('Depot mapping saved')

})();

export default app
