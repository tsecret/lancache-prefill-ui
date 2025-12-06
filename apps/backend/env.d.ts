declare module "bun" {
  interface Env {
    DEV: string
    CONFIGS_PATH: string
    LANCACHE_LOGS_PATH: string
    SETTINGS_PATH?: string
    STEAM_API_KEY: string
    STEAM_USER_ID: string
    REDIS_URL: string
    WATCHYOURLAN_HOST: string
  }
}

declare module "*.log" {
  const content: string;
  export default content;
}
