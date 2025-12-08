import axios from "axios"

// Try to read from window config (injected at runtime) or fall back to env/build-time config
const getApiBaseUrl = (): string => {
  // Runtime config (injected by entrypoint script)
  if (typeof window !== 'undefined' && (window as any).__API_BASE_URL__) {
    const url = (window as any).__API_BASE_URL__
    console.log('[API] Using runtime BACKEND_HOST:', url)
    return url
  }
  // Build-time config (Vite env var)
  const fallback = import.meta.env.VITE_BACKEND_HOSTNAME || import.meta.env.BACKEND_HOSTNAME || 'http://localhost:3000'
  console.log('[API] Using fallback BACKEND_HOST:', fallback)
  return fallback
}

const API_BASE_URL = getApiBaseUrl()
console.log('[API] Final API_BASE_URL:', API_BASE_URL)

export const apiUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return `${API_BASE_URL}/${cleanPath}`
}

export const apiFetch = async (path: string, options?: RequestInit): Promise<Response> => {
  return fetch(apiUrl(path), options)
}

export const apiPost = async (path: string, body: any) => {
  const res = await axios.post(apiUrl(path), body)
  return res.data
}
