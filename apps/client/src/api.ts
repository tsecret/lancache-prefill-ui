const API_BASE_URL = import.meta.env.BACKEND_HOSTNAME || 'http://localhost:3000'

export const apiUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return `${API_BASE_URL}/${cleanPath}`
}

export const apiFetch = async (path: string, options?: RequestInit): Promise<Response> => {
  return fetch(apiUrl(path), options)
}
