import { mock, vi } from 'bun:test'
import GetOwnedGames from '../tests/fixtures/steam/GetOwnedGames.json'
import containers from '../tests/fixtures/docker/containers.json'

class MockedContainer{
  constructor(){}

  async logs(){
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

globalThis.Bun.file = mock((path: string) => {
    return {
      json: async () => [1,2,4, 'pro'],
      write: async (_data: string) => {},
    };
  }) as any;
