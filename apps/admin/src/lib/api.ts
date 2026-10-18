// The API base URL must be configurable: in the native app the frontend
// is not served from the same origin as the API.
export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export const getHealth = async (): Promise<{ status: string }> => {
  const res = await fetch(`${API_URL}/health`)
  return res.json()
}
