import { cookies } from "next/headers"
import { verifyToken, getUserById, issueMockPrivyToken, type User } from "./auth"

const MOCK_TOKEN = await issueMockPrivyToken()

export async function getSession(): Promise<User | null> {
  if (process.env.NODE_ENV === "development") {
    return getUserById(JSON.parse(MOCK_TOKEN).userId)
  }

  const cookieStore = await cookies()
  const token = cookieStore.get("session")?.value
  if (!token) return null

  const payload = await verifyToken(token)
  if (!payload) return null

  return getUserById(payload.userId)
}