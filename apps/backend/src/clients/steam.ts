import axios from "axios"


type Response<T> = {
  response: T
}

type GetOwnedGames = {
  game_count: number,
  games: {
    appid: number
    name: string
    playtime_forever: number
    img_icon_url: string
  }[]
}

type AppInfo = {
  steam_appid: number
  header_image: string
}

class SteamClient {

  private BASE_URL = 'https://api.steampowered.com'
  private DEFAULT_PARAMS = { key: Bun.env.STEAM_API_KEY, steamid: Bun.env.STEAM_USER_ID }

  async listApps(): Promise<Response<GetOwnedGames>> {
    const res = await axios.get(`${this.BASE_URL}/IPlayerService/GetOwnedGames/v1/`, { params: { ...this.DEFAULT_PARAMS, include_appinfo: true }})
    return res.data
  }

  async getAppInfo(appid: number): Promise<AppInfo>{
    const res = await axios.get(`https://store.steampowered.com/api/appdetails?appids=${appid}`)
    return res.data[appid].data
  }
}

export const steamClient = new SteamClient()
