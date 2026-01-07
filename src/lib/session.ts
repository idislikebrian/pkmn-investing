import { cookies } from "next/headers";
import { verifyToken, getUserById, type User } from "./auth";

export async function getSession(): Promise<User | null> {
  const cookieStore = await cookies();

  // ---- DEV: mock session flow
  if (process.env.NODE_ENV === "development") {
    const mock = cookieStore.get("mock-session")?.value;
    if (!mock) return null;

    const { userId } = JSON.parse(mock);
    return getUserById(userId);
  }

  // ---- PROD: real token flow
  const token = cookieStore.get("session")?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  return getUserById(payload.userId);
}
