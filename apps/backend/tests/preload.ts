import { mock } from 'bun:test'
import GetOwnedGames from '../tests/fixtures/steam/GetOwnedGames.json'

mock.module('../src/clients/steam.ts', () => {
  return {
    steamClient: {
      listApps: async () => GetOwnedGames
    }
  }
})


globalThis.Bun.file = mock((path: string) => {
    return {
      json: async () => [1,2,4],
      write: async () => {},
      writer: async () => {},
    };
  }) as any;
