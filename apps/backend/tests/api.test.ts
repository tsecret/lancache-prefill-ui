import { afterEach, beforeEach, describe, expect, it, jest, mock, setSystemTime } from 'bun:test'
import { Container, Settings, Stats } from 'shared/types'
import containersApp from '../src/routes/containers'
import devicesApp from '../src/routes/devices'
import gamesApp from '../src/routes/games'
import statsApp, { parseLogFile, scheduledLogParse } from '../src/routes/stats'
import { isAllowedToDownload } from '../src/utils'
import containers from './fixtures/docker/containers.json'

import downloadAndReuseLog from './fixtures/logs/download_and_reuse.log'
import downloadMixed from './fixtures/logs/download_mixed.log'
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

  it('Cached stats', async () => {
    mock.module('../src/routes/stats.ts', () => ({ readLogFile: async () => await Bun.file(downloadSingleLog).text() }))
    await scheduledLogParse()
    const stats: Stats = JSON.parse(await globalThis.Bun.redis.get('stats') as string)
    expect(stats.bytesDownloaded).toBe(3000)
  })

  it('Downloads single game', async () => {
    mock.module('../src/routes/stats.ts', () => ({ readLogFile: async () => await Bun.file(downloadSingleLog).text() }))
    const stats = await parseLogFile()
    expect(stats.bytesDownloaded).toEqual(3000)
    expect(stats.bytesReused).toEqual(0)
    expect(stats.downloads.length).toEqual(1)
    expect(stats.downloads[0].bytesDownloaded).toEqual(3000)
    expect(stats.downloads[0].appName).toEqual('Test Game 1')
  })

  it('Downloads multiple games', async () => {
    mock.module('../src/routes/stats.ts', () => ({ readLogFile: async () => await Bun.file(downloadMultipleLog).text() }))
    const stats = await parseLogFile()
    expect(stats.bytesDownloaded).toEqual(9000)
    expect(stats.bytesReused).toEqual(0)
    expect(stats.downloads.length).toEqual(2)
    expect(stats.downloads[0].appName).toEqual('Test Game 2')
    expect(stats.downloads[1].appName).toEqual('Test Game 1')
  })

  it('Downloads and reuse', async () => {
    mock.module('../src/routes/stats.ts', () => ({ readLogFile: async () => await Bun.file(downloadAndReuseLog).text() }))
    const stats = await parseLogFile()
    expect(stats.bytesDownloaded).toEqual(3000)
    expect(stats.bytesReused).toEqual(3000)
    expect(stats.downloads.length).toEqual(1)
    expect(stats.reuses.length).toEqual(1)
  })

  it('Reuse multiple', async () => {
    mock.module('../src/routes/stats.ts', () => ({ readLogFile: async () => await Bun.file(reuseMultiple).text() }))
    const stats = await parseLogFile()
    expect(stats.bytesDownloaded).toEqual(3000)
    expect(stats.bytesReused).toEqual(6000)
    expect(stats.downloads.length).toEqual(1)
    expect(stats.reuses.length).toEqual(2)
  })

  it('Mixes downloads', async () => {
    mock.module('../src/routes/stats.ts', () => ({ readLogFile: async () => await Bun.file(downloadMixed).text() }))
    const stats = await parseLogFile()
    expect(stats.downloads.length).toEqual(2)
  })

  it('Delete Reuse', async () => {
    mock.module('../src/routes/stats.ts', () => ({ readLogFile: async () => await Bun.file(reuseMultiple).text() }))
    const stats = await parseLogFile()

    const res = await statsApp.request('/reuse', { method: 'DELETE', body: JSON.stringify({ service: 'steam', startedAtString: stats.reuses[0].startedAtString, depots: stats.reuses[0].depots }) })
    expect(await res.json()).toEqual({ deletedLines: 3 })

  })

  it('Delete Download', async () => {
    mock.module('../src/routes/stats.ts', () => ({ readLogFile: async () => await Bun.file(reuseMultiple).text() }))
    const stats = await parseLogFile()

    const res = await statsApp.request('/download', { method: 'DELETE', body: JSON.stringify({ service: 'steam', startedAtString: stats.downloads[0].startedAtString, depots: stats.downloads[0].depots }) })
    expect(await res.json()).toEqual({ deletedLines: 3 })


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

describe('Check', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('Check disabled', async () => {
    const mockedSettings = {
     check: {
      enabled: false
     },
     restriction: {
      enabled: false
     }
    } as Partial<Settings>

    expect(isAllowedToDownload(mockedSettings as Settings)).toBe(false)
  })

  it('Check enabled', async () => {
    const mockedSettings = {
     check: {
      enabled: true
     },
     restriction: {
      enabled: false
     }
    } as Partial<Settings>

    expect(isAllowedToDownload(mockedSettings as Settings)).toBe(true)
  })

  it('Check enabled, no restriction', async () => {
    const mockedSettings = {
     check: {
      enabled: true
     },
     restriction: {
      enabled: false
     }
    } as Partial<Settings>

    expect(isAllowedToDownload(mockedSettings as Settings)).toBe(true)
  })

  it('Check enabled, restriction enabled, outside of allowed window', async () => {
    const mockedSettings = {
      check: {
        enabled: true
      },
      restriction: {
        enabled: true,
        allowedTimeWindow: [9, 18]
      }
    } as Partial<Settings>

    const date = new Date(2025, 1, 1, 8)
    setSystemTime(date)

    expect(isAllowedToDownload(mockedSettings as Settings)).toBe(false)
  })

  it('Check enabled, restriction enabled, inside of allowed window', async () => {
    const mockedSettings = {
      check: {
        enabled: true
      },
      restriction: {
        enabled: true,
        allowedTimeWindow: [9, 18]
      }
    } as Partial<Settings>

    const date = new Date(2025, 1, 1, 10)
    setSystemTime(date)

    expect(isAllowedToDownload(mockedSettings as Settings)).toBe(true)
  })

  it.each([6, 10, 22])('Check enabled, restriction enabled, outside of midnight crosseing window', async (hour) => {
    const mockedSettings = {
      check: {
        enabled: true
      },
      restriction: {
        enabled: true,
        allowedTimeWindow: [23, 5]
      }
    } as Partial<Settings>

    const date = new Date(2025, 1, 1, hour)
    setSystemTime(date)

    expect(isAllowedToDownload(mockedSettings as Settings)).toBe(false)
  })

  it.each([23, 0, 1, 2, 3, 4, 5])('Check enabled, restriction enabled, inside of midnight crosseing window', async (hour) => {
    const mockedSettings = {
      check: {
        enabled: true
      },
      restriction: {
        enabled: true,
        allowedTimeWindow: [23, 5]
      }
    } as Partial<Settings>

    const date = new Date(2025, 1, 1, hour)
    setSystemTime(date)

    expect(isAllowedToDownload(mockedSettings as Settings)).toBe(true)
  })
})
