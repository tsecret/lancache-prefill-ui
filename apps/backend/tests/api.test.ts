import { describe, expect, it } from 'bun:test'
import steamApp from '../src/routes/games'
import statsApp from '../src/routes/stats'
import containersApp from '../src/routes/containers'


describe.skip('Docker', () => {
  it('GET /containers', async () => {
    const res = await containersApp.request('/')
    console.log('await res.json()', await res.json())
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
    const res = await steamApp.request('/steam')
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
        selected: true,
        imgUrl: "",
      }
    ])
  })

  it('POST /steam', async () => {
    const res = await steamApp.request('/steam', { method: 'POST', body: JSON.stringify({ apps: [1, 2, 3] }) })
    expect(await res.json()).toEqual({ success: true })
  })
})
