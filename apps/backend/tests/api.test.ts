import { describe, expect, it } from 'bun:test'
import gamesApp from '../src/routes/games'
import statsApp from '../src/routes/stats'
import containersApp from '../src/routes/containers'
import devicesApp from '../src/routes/devices'
import containers from './fixtures/docker/containers.json'
import { Container } from 'shared/types'

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

describe.skip('Lancache Logs', () => {
  it('GET /stats', async () => {
    const res = await statsApp.request('/')
    console.log('res.json()', await res.json())
  })
})

describe('Steam Games', () => {
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

describe('Battlenet Games', () => {
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
