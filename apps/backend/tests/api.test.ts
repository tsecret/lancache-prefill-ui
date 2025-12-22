import { afterEach, beforeEach, describe, expect, it, jest, mock, setSystemTime } from 'bun:test'
import { Container, Settings, Stats } from 'shared/types'
import containersApp from '../src/routes/containers'
import devicesApp from '../src/routes/devices'
import gamesApp from '../src/routes/games'
import statsApp, { parseLogFile } from '../src/routes/stats'
import { isAllowedToDownload } from '../src/utils'
import containers from './fixtures/docker/containers.json'

import downloadAndReuseLog from './fixtures/logs/download_and_reuse.log'
import downloadBattlenet from './fixtures/logs/download_battlenet.log'
import downloadEpic from './fixtures/logs/download_epic.log'
import downloadMixed from './fixtures/logs/download_mixed.log'
import downloadMultipleLog from './fixtures/logs/download_multiple_games.log'
import downloadSingleLog from './fixtures/logs/download_single_game.log'
import reuseBattlenet from './fixtures/logs/reuse_battlenet.log'
import reuseEpic from './fixtures/logs/reuse_epic.log'
import reuseMultiple from './fixtures/logs/reuse_multiple.log'
import deleteEpic from './fixtures/logs/delete_epic.log'
import deleteSteam from './fixtures/logs/delete_steam.log'
import deleteSteamZeroBytes from './fixtures/logs/delete_steam_zero_bytes.log'
import deleteBlizzard from './fixtures/logs/delete_blizzard.log'
import deleteRiot from './fixtures/logs/delete_riot.log'
import downloadRiot from './fixtures/logs/download_riot.log'
import reuseRiot from './fixtures/logs/reuse_riot.log'


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

  describe('Delete app', () => {
    it('Delete epic games', async () => {
      mock.module('../src/routes/stats.ts', () => ({ readLogFile: async () => await Bun.file(deleteEpic).text() }))
      const stats = await parseLogFile()

      const res = await statsApp.request('/download', { method: 'DELETE', body: JSON.stringify({ service: 'epicgames', startedAtString: stats.downloads[0].startedAtString, depots: stats.downloads[0].depots }) })
      expect((await res.json()).paths).toEqual(['99/ff/589c5848992c2f4a31b2ac8cb6cdff99'])
    })

    it('Delete steam', async () => {
      mock.module('../src/routes/stats.ts', () => ({ readLogFile: async () => await Bun.file(deleteSteam).text() }))
      const stats = await parseLogFile()

      const res = await statsApp.request('/download', { method: 'DELETE', body: JSON.stringify({ service: 'steam', startedAtString: stats.downloads[0].startedAtString, depots: stats.downloads[0].depots }) })
      expect((await res.json()).paths).toEqual(['ad/9e/ec3b17e8fca499083cdbf7100d299ead'])
    })

    it('Delete steam with 0 bytes', async () => {
      mock.module('../src/routes/stats.ts', () => ({ readLogFile: async () => await Bun.file(deleteSteamZeroBytes).text() }))
      const stats = await parseLogFile()

      const res = await statsApp.request('/download', { method: 'DELETE', body: JSON.stringify({ service: 'steam', startedAtString: stats.downloads[0].startedAtString, depots: stats.downloads[0].depots }) })
      expect((await res.json()).paths).toEqual(['ad/9e/ec3b17e8fca499083cdbf7100d299ead'])
    })

    it('Delete battlenet', async () => {
      mock.module('../src/routes/stats.ts', () => ({ readLogFile: async () => await Bun.file(deleteBlizzard).text() }))
      const stats = await parseLogFile()

      const expected = ["66/76/97e381e08fe89f4cc0cf86861adf7666", "79/87/04edd6774c184e545466fe76dd828779", "db/b3/6b611cb1a38df82ff69662495ab1b3db", "04/7a/e27f07bf065fa0365c2adac767607a04", "84/24/ac12fabadd284376dda33f5e3fe92484", "0e/9b/ec2a1bd296cbea095207f0b16c709b0e", "a6/49/552e492f86a9b616e26be833235849a6", "76/6f/dc819e392b28751aba9ef328f7bd6f76", "f2/11/b5b2fff147b61076452069aea03911f2", "9d/79/3088cf5a4ab081f427a08f139b02799d", "7d/2c/609cd317dae2a170579b713b6b1c2c7d", "78/81/66bb9e1bece6ce8516b8d03c62bd8178", "ac/a1/edeea66d42d399ed65cc58720701a1ac", "b4/e4/9ac7cab8f7dc48420597fcde37f4e4b4", "e7/68/ceae6600ce059e8ed226321a335a68e7", "4a/ab/23bac74915a9b3bd9349d9270914ab4a", "c8/5b/91d377b4ae97c1f8dc66c69c38305bc8", "a0/34/0491919a9a6dc04cfc9d71a67ecc34a0", "06/f9/31d18e0a28a856e77a410b2bd324f906", "7b/c9/c3dabce332db5fb3f64767f0ffddc97b", "15/84/496fa4c10266d1082a5f7b60ba808415", "4a/41/3c79ea6bd11a200fed451e39893a414a", "56/38/cc6c551a8363f4ec18771a740adb3856", "d2/53/1ea3e50ee107cc4ab5c788b3d5b953d2", "59/b8/359616c5a8670b7b11ec801a1304b859", "38/f8/ac55a6be02420dbd45fa0eed73f9f838", "14/49/1b63a026adddf8e7b7772085455f4914", "b3/ba/324a9916caca616af8aecc03dbd8bab3", "36/9a/fbc3abacc229c6f0e267c64f6ddc9a36", "77/0e/ee7536d4ac1aadf7d5d45cd250750e77", "c8/c6/26a28f347fe96f45348ac0cdfc6cc6c8", "40/fa/ea1bcc529235b77b1740b3aea6dafa40", "a5/50/0253ec99e88eb086656683d1d5fc50a5", "08/aa/529dfb46e38eb04534eb8d9da937aa08", "84/98/5f4c14a22441cdf435117aea97719884", "82/c8/b543c3e4a2a7b30b7695c5a9a7fbc882", "b2/a3/50b3e12d13d533686976e8ace6b0a3b2", "58/4b/d0e813dd55dc3cc41f4e36293d684b58", "81/9f/00b9f2a8d6f0257c57272ef538a89f81", "37/df/6234ebe9555854d13af042ef38ffdf37", "c0/4f/fc0c45a09ac96d10494eeb822d984fc0", "96/d0/bd81a1e06c4db7976783b267d81dd096", "65/d2/becba6aa10b8ceec69b5444c19a0d265", "db/41/6e347395c5b0141b2e1986ef8c6b41db", "cb/11/1a874cb41a28a0f1654c61bc68c011cb", "09/29/b69e1fc9ae2c3990cbed1b33282a2909", "9b/79/b55f2cbe1c12664fd789a7a594ff799b", "c6/36/1abe40ff6fa03765bb7247f3213d36c6", "a0/da/03f0141e09e8504f531fee310fecdaa0", "d6/c5/17a9f86e5e9117b223b8d458a3b3c5d6", "9f/cf/45b7bf9c918b7fe9d9939fc96597cf9f", "ef/85/55083cb6fbf4254c2cedabf1cb9d85ef", "4d/02/1b9ecd433695efd779888e08cf6c024d", "9e/ff/43fe502314e0f432d1f0ec7dab69ff9e", "21/a1/a584092283bb5657dbcd9bb9949da121", "50/ab/be8709746075fb96bf6ac96009efab50", "cd/f8/37bb34c474ec2325ad7cf0fdde3cf8cd", "5b/b2/8a4ec59997f090d1182ce79bd0c5b25b", "9a/81/2eb8dc8caeb76bbe1322bebac1ab819a", "f0/3f/94efc11fe6d326b8724a3e22c9b53ff0", "49/ec/cc63709cf36177fa2ab30474ca08ec49", "53/9a/b2df3b258bdfa82a16b5061957009a53", "54/99/701b528efe5854c0a63a94e3ef699954", "73/6d/b8b629fc399a0f4dd68ceecfc9086d73", "44/3f/2054d11295cf6514d8f24c066dc53f44", "a0/aa/b22451596311649631d651bd202faaa0", "97/a3/d00cdf615c6bb1c3bac7c2db86caa397", "83/12/cd8b9f70490275a634e250b4fdda1283", "b2/f4/e734fa72687ddfbaf7895631c5f2f4b2", "a2/89/06f5eed499680ab343dcc93f66b989a2", "89/1d/d3bfa46022c7f0fb35126a7b5ec81d89", "95/7c/f9d250496f7539502d422ed0be8e7c95", "e4/82/438b3afb0ea936ed5c89c912c90682e4", "b6/44/dd0e62c52272260f7fecd9b2e38e44b6", "c1/1a/5610161be12a6f375c7c0f7bcfc51ac1", "c7/b0/71f716c749889f4bf40220447c5fb0c7", "19/af/b935b8171a305d6dc8b582d97f89af19", "a7/2d/28d9e1be8dc7286c24bfc139d9bc2da7", "96/17/43d36fe37ad4c650fd83df29e8f11796", "dc/41/f170469a46f9e6e03273099f954941dc", "98/f3/153a2e35d7b96b903a4676915475f398", "d6/cc/7ba15fd2a9739b18d1f0cb1bacb1ccd6", "ec/36/488c6b8eaf25eecfe1932190f14536ec", "72/2a/89b3dc0b744ab4e107c8b206d5162a72", "68/83/2f2baa745ae1d28042ae4fc5aaae8368", "f7/56/f501d296f335634a79791e4bf91456f7", "bc/c9/458a8623f175869366f9405fe81dc9bc", "ed/db/afeda314b2c24a83620c78d9398ddbed", "44/6e/62bc9a86fbac8ef4371b7992a2d56e44", "60/65/8257e6fe22914443c770d6a98cc86560", "80/d9/3b161cfb649f59c7819e0c390419d980", "24/cc/49eccaa5f4dd2a89f572fa3be175cc24", "35/71/35180de8298bccb9f5ee50eb7a5c7135", "a0/09/fff6ced5df2b1f5c7758158eaa4c09a0", "d2/5c/92b49fa1f75a645b5b2acf13859d5cd2", "d7/9b/853964c6cdcbf412a754bde50f0b9bd7", "e9/13/ac1aa9be4bd956602679dc322a3b13e9", "c4/b7/49f64fac3924dc838a89a6bd0cf7b7c4", "7d/83/d52f536be4b5c19db2b78c609491837d", "37/7e/4eda2ecaecd182b4a861ed4bd85a7e37", "b0/69/658bcf9baa6a5d059552044df95769b0", "43/5a/1b01ab43f3dabdabd3ca06c792035a43", "a1/f0/f23cde810721408c78ec29721c00f0a1", "ba/46/3041a87c72179774a207999e95ce46ba", "01/e7/4698880778d15061315f8333e12ce701", "36/75/8496cc9e462581f1e083e5d1c5017536", "73/34/87054d0bebc285306517e2d2e1453473", "46/52/63e8ae3e52049fa22840db89a97a5246", "b5/53/4304cb412db0653a85123c05d76653b5", "74/92/6a648e1082abd67eef51445bfa299274", "f1/5f/ed05e38a5d0e8e2c6a73905a16735ff1", "c8/b5/07faae52eb5fe1c47ff83715a706b5c8", "f8/34/ed397a148558763378ffc3f9422b34f8", "be/9a/370b077ca19219d8cf47fb638b499abe", "b0/cb/351a3bf67f795d73960397b10d92cbb0", "81/22/f5fbe059ae087489955d53ad9b772281", "dd/44/5c65fdc565624badf1ca560c90f044dd", "2f/9c/1d9fa0279748555e40d10905ee9f9c2f"]

      const res = await statsApp.request('/download', { method: 'DELETE', body: JSON.stringify({ service: 'blizzard', startedAtString: stats.downloads[0].startedAtString, depots: stats.downloads[0].depots }) })
      expect((await res.json()).paths).toEqual(expected)
    })

    it.skip('Delete riot', async () => {
      mock.module('../src/routes/stats.ts', () => ({ readLogFile: async () => await Bun.file(deleteRiot).text() }))
      const stats = await parseLogFile()

      const expected = [
        "72/cf/95f64a3d12f3d47a9eec2e5e047fcf72",
        "1c/57/6b45cb48bce376adbd59320e4df0571c",
        "78/eb/284efbba1821ee73e31843d22b5feb78",
      ]

      const res = await statsApp.request('/download', { method: 'DELETE', body: JSON.stringify({ service: 'riot', startedAtString: stats.downloads[0].startedAtString, depots: stats.downloads[0].depots }) })
      expect((await res.json()).paths).toEqual(expected)
    })

  })


  describe('Epic', () => {

    it('Game Download', async () => {
      mock.module('../src/routes/stats.ts', () => ({ readLogFile: async () => await Bun.file(downloadEpic).text() }))
      const stats = await parseLogFile()
      expect(stats.downloads.length).toBe(1)
      expect(stats.downloads[0].bytesDownloaded).toBe(3000)
      expect(stats.downloads[0].appName).toBe('Fortnite')
    })

    it('Game Reuse', async () => {
      mock.module('../src/routes/stats.ts', () => ({ readLogFile: async () => await Bun.file(reuseEpic).text() }))
      const stats = await parseLogFile()
      expect(stats.reuses.length).toBe(1)
      expect(stats.reuses[0].bytesDownloaded).toBe(3000)
      expect(stats.reuses[0].appName).toBe('Fortnite')
    })

  })

  describe('Battlenet', () => {

    it('Game Download', async () => {
      mock.module('../src/routes/stats.ts', () => ({ readLogFile: async () => await Bun.file(downloadBattlenet).text() }))
      const stats = await parseLogFile()
      expect(stats.downloads.length).toBe(1)
      expect(stats.downloads[0].bytesDownloaded).toBe(3000)
      expect(stats.downloads[0].appName).toBe('Hearthstone')
    })

    it('Game Reuse', async () => {
      mock.module('../src/routes/stats.ts', () => ({ readLogFile: async () => await Bun.file(reuseBattlenet).text() }))
      const stats = await parseLogFile()
      expect(stats.reuses.length).toBe(1)
      expect(stats.reuses[0].bytesDownloaded).toBe(3000)
      expect(stats.reuses[0].appName).toBe('Hearthstone')
    })

  })

  describe('Riot', () => {
    it('Game Download', async () => {
      mock.module('../src/routes/stats.ts', () => ({ readLogFile: async () => await Bun.file(downloadRiot).text() }))
      const stats = await parseLogFile()
      expect(stats.downloads.length).toBe(1)
      expect(stats.downloads[0].bytesDownloaded).toBe(10541496)
      expect(stats.downloads[0].appName).toBe('valorant')
    })

    it('Game Reuse', async () => {
      mock.module('../src/routes/stats.ts', () => ({ readLogFile: async () => await Bun.file(reuseRiot).text() }))
      const stats = await parseLogFile()
      expect(stats.reuses.length).toBe(1)
      expect(stats.reuses[0].bytesDownloaded).toBe(10541496)
      expect(stats.reuses[0].appName).toBe('valorant')
    })
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
