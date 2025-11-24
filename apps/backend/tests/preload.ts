import { mock, vi } from 'bun:test'
import GetOwnedGames from '../tests/fixtures/steam/GetOwnedGames.json'
import containers from '../tests/fixtures/docker/containers.json'

mock.module('dockerode', () => {
  return {
    __esModule: true,
    default: vi.fn().mockImplementation(() => {
      return {
        listContainers: async () => containers,
        getContainer: async (id: string) => containers.find(c => c.Id === id)
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


// globalThis.Bun.file = mock((path: string) => {
//     return {
//       json: async () => [1,2,4],
//       write: async () => {},
//       writer: async () => {},
//     };
//   }) as any;
