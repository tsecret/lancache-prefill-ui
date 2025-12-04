import { describe, expect, it, mock } from 'bun:test'
import { Container } from 'shared/types'
import containersApp from '../src/routes/containers'
import devicesApp from '../src/routes/devices'
import gamesApp from '../src/routes/games'
import { parseLogFile } from '../src/routes/stats'
import containers from './fixtures/docker/containers.json'

import downloadAndReuseLog from './fixtures/logs/download_and_reuse.log'
import downloadMultipleLog from './fixtures/logs/download_multiple_games.log'
import downloadSingleLog from './fixtures/logs/download_single_game.log'
import reuseMultiple from './fixtures/logs/reuse_multiple.log'

describe('Docker', () => {
  it('GET /containers', async () => {
    const res = await containersApp.request('/')
    expect(await res.json()).toEqual([{
      id: containers[0].Id.slice(0, 12),
      image: containers[0].Image,
      name: containers[0].Name,
      created: 0,
      state: containers[0].State as any,
      uptime: "",
    }] satisfies Container[])
  })
})

describe('Stats', () => {

  it('Downloads single game', async () => {
    mock.module('../src/routes/stats.ts', () => ({ readLogFile: async () => await Bun.file(downloadSingleLog).text() }))
    const stats = await parseLogFile('')
    expect(stats.bytesDownloaded).toEqual(3000)
    expect(stats.bytesReused).toEqual(0)
    expect(stats.downloads.length).toEqual(1)
    expect(stats.downloads[0].bytesDownloaded).toEqual(3000)
    expect(stats.downloads[0].appName).toEqual('Test Game 1')
  })

  it('Downloads multiple games', async () => {
    mock.module('../src/routes/stats.ts', () => ({ readLogFile: async () => await Bun.file(downloadMultipleLog).text() }))
    const stats = await parseLogFile('')
    expect(stats.bytesDownloaded).toEqual(6000)
    expect(stats.bytesReused).toEqual(0)
    expect(stats.downloads.length).toEqual(2)
    expect(stats.downloads[0].appName).toEqual('Test Game 2')
    expect(stats.downloads[1].appName).toEqual('Test Game 1')
  })

  it('Downloads and reuse', async () => {
    mock.module('../src/routes/stats.ts', () => ({ readLogFile: async () => await Bun.file(downloadAndReuseLog).text() }))
    const stats = await parseLogFile('')
    expect(stats.bytesDownloaded).toEqual(3000)
    expect(stats.bytesReused).toEqual(3000)
    expect(stats.downloads.length).toEqual(1)
    expect(stats.reuses.length).toEqual(1)
  })

  it('Reuse multiple', async () => {
    mock.module('../src/routes/stats.ts', () => ({ readLogFile: async () => await Bun.file(reuseMultiple).text() }))
    const stats = await parseLogFile('')
    expect(stats.bytesDownloaded).toEqual(3000)
    expect(stats.bytesReused).toEqual(6000)
    expect(stats.downloads.length).toEqual(1)
    expect(stats.reuses.length).toEqual(2)
  })
})

describe.skip('Steam Games', () => {
  it('GET /steam', async () => {
    const res = await gamesApp.request('/steam')
    expect(await res.json()).toEqual([
      {
        appid: 1,
        name: "Game 1",
        hoursPlayed: 50,
        selected: true,
        imgUrl: "",
      }, {
        appid: 2,
        name: "Game 2",
        hoursPlayed: 33,
        selected: true,
        imgUrl: "",
      }, {
        appid: 3,
        name: "Game 3",
        hoursPlayed: 1,
        selected: false,
        imgUrl: "",
      }
    ])
  })

  it('POST /steam', async () => {
    const res = await gamesApp.request('/steam', { method: 'POST', body: JSON.stringify({ apps: [1, 2, 3] }) })
    expect(await res.json()).toEqual({ success: true })
  })
})

describe.skip('Battlenet Games', () => {
  it('GET /battlenet', async () => {
    const res = await gamesApp.request('/battlenet')
    expect(await res.json()).toEqual([
      {
        appid: 'hsb',
        name: 'Hearthstone',
        imgUrl: 'https://upload.wikimedia.org/wikipedia/en/f/f2/Hearthstone_2016_logo.png?20200131122824',
        selected: false,
      },
      {
        appid: 'pro',
        name: 'Overwatch 2',
        imgUrl: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2357570/e9cfc3828ebc0501e81a35760c451eb3b0734dea/header.jpg',
        selected: true
      },
    ])
  })

  it('POST /battlenet', async () => {
    const res = await gamesApp.request('/battlenet', { method: 'POST', body: JSON.stringify({ apps: [1, 2, 3] }) })
    expect(await res.json()).toEqual({ success: true })
  })
})

describe.skip('Devices', () => {
  it('GET /devices', async () => {
    const res = await devicesApp.request('/')
  })
})
