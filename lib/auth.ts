export interface Session {
  userId: string
  name: string
  role: string
  branchId?: string
  branchName?: string
}

// Dev mode: hardcoded session — no login required
export async function getSession(): Promise<Session> {
  return {
    userId: 'dev-user-id',
    name: 'Dev User',
    role: 'super_admin',
  }
}
