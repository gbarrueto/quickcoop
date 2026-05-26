export type MockUser = {
  id: string
  name: string
  email: string
  password: string
}

const USERS_KEY = "qcoop-mock-users"
const SESSION_KEY = "qcoop-mock-session"

const SEEDED_USERS: MockUser[] = [
  {
    id: "user-demo",
    name: "Demo Player",
    email: "demo@qcoop.app",
    password: "demo123",
  },
]

type SessionPayload = {
  userId: string
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function readUsers(): MockUser[] {
  if (typeof window === "undefined") {
    return SEEDED_USERS
  }

  try {
    const raw = window.localStorage.getItem(USERS_KEY)
    if (!raw) {
      return [...SEEDED_USERS]
    }

    const parsed = JSON.parse(raw) as MockUser[]
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [...SEEDED_USERS]
    }

    return parsed
  } catch {
    return [...SEEDED_USERS]
  }
}

function persistUsers(users: MockUser[]) {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.setItem(USERS_KEY, JSON.stringify(users))
  } catch {
    // Ignore storage quota/privacy failures.
  }
}

export function ensureMockUsers() {
  const users = readUsers()
  const hasSeeded = users.some((user) => user.email === SEEDED_USERS[0].email)
  if (!hasSeeded) {
    persistUsers([...SEEDED_USERS, ...users])
    return
  }

  persistUsers(users)
}

export function registerMockUser(payload: {
  name: string
  email: string
  password: string
}): { ok: true; user: MockUser } | { ok: false; message: string } {
  ensureMockUsers()

  const normalizedName = payload.name.trim()
  const normalizedEmail = payload.email.trim().toLowerCase()
  const normalizedPassword = payload.password.trim()

  if (!normalizedName || !normalizedEmail || !normalizedPassword) {
    return { ok: false, message: "Please complete all fields." }
  }

  if (!normalizedEmail.includes("@")) {
    return { ok: false, message: "Invalid email format." }
  }

  if (normalizedPassword.length < 4) {
    return { ok: false, message: "Password must be at least 4 characters." }
  }

  const users = readUsers()
  const alreadyExists = users.some((user) => user.email === normalizedEmail)
  if (alreadyExists) {
    return { ok: false, message: "An account with that email already exists." }
  }

  const baseId = slugify(normalizedName || normalizedEmail.split("@")[0]) || "user"
  const uniqueSuffix = Date.now().toString(36)
  const user: MockUser = {
    id: `${baseId}-${uniqueSuffix}`,
    name: normalizedName,
    email: normalizedEmail,
    password: normalizedPassword,
  }

  persistUsers([...users, user])
  persistMockSession(user.id)
  return { ok: true, user }
}

export function loginMockUser(payload: {
  email: string
  password: string
}): { ok: true; user: MockUser } | { ok: false; message: string } {
  ensureMockUsers()

  const email = payload.email.trim().toLowerCase()
  const password = payload.password.trim()
  const users = readUsers()
  const user = users.find((candidate) => candidate.email === email)

  if (!user || user.password !== password) {
    return { ok: false, message: "Incorrect credentials." }
  }

  persistMockSession(user.id)
  return { ok: true, user }
}

function persistMockSession(userId: string) {
  if (typeof window === "undefined") {
    return
  }

  const payload: SessionPayload = { userId }
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(payload))
  } catch {
    // Ignore storage errors.
  }
}

export function getCurrentMockUser(): MockUser | null {
  if (typeof window === "undefined") {
    return null
  }

  ensureMockUsers()
  try {
    const raw = window.localStorage.getItem(SESSION_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as SessionPayload
    if (!parsed.userId) {
      return null
    }

    const user = readUsers().find((candidate) => candidate.id === parsed.userId)
    return user ?? null
  } catch {
    return null
  }
}

export function logoutMockUser() {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.removeItem(SESSION_KEY)
  } catch {
    // Ignore storage errors.
  }
}