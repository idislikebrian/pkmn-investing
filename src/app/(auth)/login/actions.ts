"use server";

import { cookies } from "next/headers";
import { issueMockPrivyToken } from "@/lib/auth";

export async function mockLogin() {
  const cookieStore = await cookies();

  const token = await issueMockPrivyToken();
  const { userId } = JSON.parse(token);

  cookieStore.set(
    "mock-session",
    JSON.stringify({ userId }),
    {
      httpOnly: true,
      path: "/",
    }
  );
}
