import { describe, expect, it } from 'bun:test'
import app from '../src/routes/games'


describe('Steam Games', () => {
  it('GET /steam', async () => {
    const res = await app.request('/steam')
    expect(await res.json()).toEqual([
      {
        appid: 1,
        name: "Game 1",
        selected: true,
        imgUrl: "",
      }, {
        appid: 2,
        name: "Game 2",
        selected: true,
        imgUrl: "",
      }, {
        appid: 3,
        name: "Game 3",
        selected: false,
        imgUrl: "",
      }
    ])
  })

  it('POST /steam', async () => {
    const res = await app.request('/steam', { method: 'POST', body: JSON.stringify({ apps: [1, 2, 3] }) })
    expect(await res.json()).toEqual({ success: true })
  })
})
