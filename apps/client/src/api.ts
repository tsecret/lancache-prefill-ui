import axios from "axios"

const API_BASE_URL = import.meta.env.BACKEND_HOSTNAME || 'http://localhost:3000'

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
