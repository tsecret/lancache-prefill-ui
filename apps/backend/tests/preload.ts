import { mock, vi } from 'bun:test'
import { Service } from 'shared/types'
import containers from '../tests/fixtures/docker/containers.json'
import GetOwnedGames from '../tests/fixtures/steam/GetOwnedGames.json'

const depotMapping = () => {

  const apps: Record<Service, { appId: string, appName: string, appImage: string, depots?: string[] }[]> = {
    steam: [
      {
        appId: "1",
        appName: 'Test Game 1',
        appImage: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/3240220/header.jpg?t=1753974947',
        depots: ["1", '10']
      },
      {
        appId: "2",
        appName: 'Test Game 2',
        appImage: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/3240220/header.jpg?t=1753974947',
        depots: ["2"]
      },
      {
        appId: "3240220",
        appName: 'Grand Theft Auto V Enhanced',
        appImage: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/3240220/header.jpg?t=1753974947',
        depots: ["3240221", "3240222", "3240223", "3240224", "3240225", "1899671"]
      },
      {
        appId: "271590",
        appName: 'Grand Theft Auto V Legacy',
        appImage: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/271590/header.jpg?t=1753979045',
        depots: ["228984", "228990", "271591", "271592", "271593", "271594", "271595", "1899671"]
      },
      {
        appId: "730",
        appName: 'Counter-Strike 2',
        appImage: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/730/header.jpg?t=1749053861',
        depots: ["2347770", "2347771", "2347774"]
      },
      {
        appId: "850170",
        appName: 'EMERGENCY',
        appImage: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/850170/header.jpg?t=1746814262',
        depots: ["850171", "850172"]
      }
    ],
    epicgames: [
      {
        appId: 'prod-fn',
        appName: 'Fortnite',
        appImage: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/850170/header.jpg?t=1746814262',
      },
      {
        appId: 'Newt',
        appName: 'idk',
        appImage: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/850170/header.jpg?t=1746814262',
      }
    ],
    blizzard: [
      {
        appId: "odin",
        appName: "Call of Duty: Modern Warfare",
        appImage: ''
      },
      {
        appId: "hs",
        appName: "Hearthstone",
        appImage: ''
      },
    ],
    riot: [],
    wsus: []
  }

  for (const service in apps){

    if (service === 'steam'){
      for (const app of apps[service]){
        const { depots, ...rest } = app
        if (depots?.length)
          for (const depot of depots) {
            mockRedisData[`apps:${service}:${depot}`] = JSON.stringify(rest)
          }
      }
    } else {
      for (const app of apps[service]) {
        mockRedisData[`apps:${service}:${app.appId}`] = JSON.stringify(app)
      }
    }

  }
}


const mockRedisData: Record<string, string> = {}
depotMapping()

if (globalThis.Bun) {
  globalThis.Bun.write = vi.fn(async () => { }),
    globalThis.Bun.redis = {
      connect: vi.fn(async () => { }),
      get: vi.fn(async (key: string) => {
        return mockRedisData[key] || null
      }),
      set: vi.fn(async (key: string, value: string) => {
        mockRedisData[key] = value
        return 'OK'
      }),
      del: vi.fn(async (key: string) => {
        const existed = key in mockRedisData
        delete mockRedisData[key]
        return existed ? 1 : 0
      }),
      exists: vi.fn(async (key: string) => {
        return key in mockRedisData ? 1 : 0
      }),
      keys: vi.fn(async (pattern: string) => {
        const regex = new RegExp(pattern.replace('*', '.*'))
        return Object.keys(mockRedisData).filter(key => regex.test(key))
      }),
    } as any
}

class MockedContainer {
  constructor() { }

  async logs() {
    return ""
  }
}

mock.module('dockerode', () => {
  return {
    __esModule: true,
    default: vi.fn().mockImplementation(() => {
      return {
        listContainers: async () => containers,
        getContainer: (id: string) => new MockedContainer()
      };
    }),
  };
});

mock.module('../src/clients/steam.ts', () => {
  return {
    steamClient: {
      listApps: async () => GetOwnedGames
    }
  }
})
