export type PrivyWallet = {
  address: string
  chainType: "ethereum" | "solana"
  verified: boolean
}

export type PrivyUser = {
  id: string
  email?: string
  phone?: string
  wallets: PrivyWallet[]
  createdAt: string
}

type PrivyTokenPayload = {
  userId: PrivyUser["id"]
  issuedAt: number
  expiresAt: number
}

const MOCK_PRIVY_USER: PrivyUser = {
  id: "privy-user-demo",
  email: "demo@pokemontracker.com",
  wallets: [
    {
      address: "0xD3m0c0ffee000000000000000000000000000000",
      chainType: "ethereum",
      verified: true,
    },
  ],
  createdAt: new Date("2024-01-01T00:00:00.000Z").toISOString(),
}

const MOCK_TOKEN: PrivyTokenPayload = {
  userId: MOCK_PRIVY_USER.id,
  issuedAt: Date.now(),
  expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7,
}

export type User = PrivyUser

export async function getUserById(id: string): Promise<User | null> {
  if (process.env.NODE_ENV === "development") {
    return id === MOCK_PRIVY_USER.id ? MOCK_PRIVY_USER : null
  }
  // Placeholder for real Privy lookup
  return null
}

export async function verifyToken(token: string): Promise<PrivyTokenPayload | null> {
  if (process.env.NODE_ENV === "development") {
    return token === JSON.stringify(MOCK_TOKEN) ? MOCK_TOKEN : null
  }
  // Placeholder for Privy server-side JWT verify
  return null
}

export async function issueMockPrivyToken() {
  return JSON.stringify(MOCK_TOKEN)
}