"use client"

import { Gamepad2, ArrowLeft, Shield, Eye, Database, Trash2, Mail, Puzzle, Globe } from "lucide-react"
import Link from "next/link"

const LAST_UPDATED = "June 27, 2026"

type Section = {
  id: string
  icon: React.ReactNode
  title: string
  content: React.ReactNode
}

const sections: Section[] = [
  {
    id: "information-we-collect",
    icon: <Database className="w-5 h-5" />,
    title: "Information We Collect",
    content: (
      <div className="space-y-4 text-muted-foreground">
        <p>
          QCoop is built to work without ever creating an account — connecting
          Steam or Epic and matching games with friends never requires signing
          up. We collect only what each feature actually needs:
        </p>
        <ul className="space-y-3 ml-4">
          {[
            {
              label: "Account Information (only if you register)",
              detail:
                "Your email address, password, and an optional display name — collected only if you choose to create a QCoop account. Passwords are handled entirely by our authentication provider (Supabase); we never see or store them in plain text.",
            },
            {
              label: "Steam Account Data",
              detail:
                "Your Steam ID, public game library, and public friends list — obtained through Steam OpenID authentication. We never see or store your Steam password.",
            },
            {
              label: "Epic Games Account Data",
              detail:
                "Your Epic Account ID, display name, and OAuth access/refresh tokens — obtained through Epic's official OAuth 2.0 login.",
            },
            {
              label: "System Specs (optional)",
              detail:
                "If you enter your computer's specs (OS, CPU/GPU tier, RAM, VRAM, storage), we use them to check whether a game will run well for you and the friends you're matching with.",
            },
            {
              label: "Xbox / Game Pass Status",
              detail:
                "A self-reported indicator of whether you hold an active Game Pass subscription, kept only in your browser. No Xbox account credentials are collected or stored.",
            },
            {
              label: "Browser Extension Data (only if installed)",
              detail:
                "Our optional Chrome extension reads the one-time login code Epic's own page displays after you sign in, and relays it inside your browser to the QuickCoop tab you already have open — see \"Browser Extension\" below for details.",
            },
          ].map((item) => (
            <li key={item.label} className="flex gap-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <span>
                <span className="font-medium text-foreground">{item.label}: </span>
                {item.detail}
              </span>
            </li>
          ))}
        </ul>
        <p>
          We do <span className="font-medium text-foreground">not</span> collect
          payment information, real names (unless you choose to type one as your
          display name), health or financial data, message contents, or your
          browsing activity outside of QCoop.
        </p>
      </div>
    ),
  },
  {
    id: "how-we-use",
    icon: <Eye className="w-5 h-5" />,
    title: "How We Use Your Information",
    content: (
      <div className="space-y-4 text-muted-foreground">
        <p>The data we collect is used exclusively for:</p>
        <ul className="space-y-3 ml-4">
          {[
            "Identifying which games you and your friends share across platforms.",
            "Displaying your connected account status within the QCoop interface.",
            "Generating multiplayer game recommendations based on your combined libraries.",
            "Checking whether everyone's hardware can run a given game, if you provided your specs.",
            "Keeping your Steam/Epic connection active across visits, if you created an account.",
            "Caching trending game data locally in your browser to reduce load times.",
            "Completing the Epic login handshake automatically instead of asking you to copy/paste a code, if you installed our browser extension.",
          ].map((item) => (
            <li key={item} className="flex gap-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p>
          We do <span className="font-medium text-foreground">not</span> sell,
          rent, or share your data with third parties for advertising or marketing
          purposes.
        </p>
      </div>
    ),
  },
  {
    id: "data-storage",
    icon: <Shield className="w-5 h-5" />,
    title: "Data Storage & Security",
    content: (
      <div className="space-y-4 text-muted-foreground">
        <p>
          How much of your data reaches our servers depends entirely on whether
          you create a QCoop account:
        </p>
        <ul className="space-y-3 ml-4">
          {[
            {
              label: "Without an account",
              detail:
                "Your Steam ID, Epic ID, specs, and imported games live only in your browser (localStorage/sessionStorage). An Epic connection is held only in temporary server memory, identified by a random session cookie — it is never written to our database, and is lost if our server restarts.",
            },
            {
              label: "With an account",
              detail:
                "We persist which store accounts you've connected (provider + your public account ID) and, for Epic, your OAuth tokens — encrypted at rest with AES-256-GCM before they ever reach the database. Public and authenticated database access to encrypted tokens is revoked at the database level; only our backend service can decrypt them. We also remember which games you own and the specs you provided, so you don't have to reconnect every visit.",
            },
            {
              label: "Passwords & credentials",
              detail:
                "We never store your Steam or Epic password. We only ever receive the identifiers and tokens those platforms issue after you log in directly with them.",
            },
            {
              label: "Friends lists",
              detail:
                "Your Steam/Epic friends list is fetched live from Steam/Epic each time you open matching — we do not store a copy of it.",
            },
            {
              label: "Encryption in transit",
              detail: "All communication between your browser and our servers uses HTTPS.",
            },
          ].map((item) => (
            <li key={item.label} className="flex gap-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <span>
                <span className="font-medium text-foreground">{item.label}: </span>
                {item.detail}
              </span>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: "browser-extension",
    icon: <Puzzle className="w-5 h-5" />,
    title: "Browser Extension",
    content: (
      <div className="space-y-4 text-muted-foreground">
        <p>
          QCoop offers an optional Chrome extension with a single purpose: making
          the Epic Games login handshake automatic instead of requiring you to
          copy and paste a code by hand. Concretely:
        </p>
        <ul className="space-y-3 ml-4">
          {[
            "After you log in on Epic's own page, the extension reads the one-time authorization code Epic displays there — the same code you'd otherwise copy yourself.",
            "It relays that code locally, inside your browser, to the QuickCoop tab you already have open. The extension itself never makes any network request — the QuickCoop page you're already using sends the resulting login request to our backend, exactly as it would for a manual paste.",
            "The extension does not read, store, or transmit anything beyond that one code. It has no analytics, no remote code (every script ships inside the extension package), and no storage permission — it keeps nothing after the page receives the code.",
            "It only activates on Epic's official login redirect page and on quickcoop.me — it does not run on any other site.",
          ].map((item) => (
            <li key={item} className="flex gap-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p>
          Not installing the extension does not limit any functionality — you can
          always connect Epic by pasting the code yourself.
        </p>
      </div>
    ),
  },
  {
    id: "third-party-services",
    icon: <Globe className="w-5 h-5" />,
    title: "Third-Party Services",
    content: (
      <div className="space-y-4 text-muted-foreground">
        <p>QCoop talks to the following third parties to do its job:</p>
        <ul className="space-y-3 ml-4">
          {[
            {
              label: "Steam & Epic Games",
              detail:
                "Used to authenticate you and fetch your library/friends list directly from the platform you connect. This is the core of what QCoop does.",
            },
            {
              label: "Supabase",
              detail:
                "Our database and authentication provider. It stores your account (if you register) and any encrypted tokens, hosted on infrastructure we manage.",
            },
            {
              label: "Vercel Analytics",
              detail:
                "Anonymous, aggregate page-view and performance metrics (e.g. load times) on our production site — no personal identifiers.",
            },
          ].map((item) => (
            <li key={item.label} className="flex gap-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <span>
                <span className="font-medium text-foreground">{item.label}: </span>
                {item.detail}
              </span>
            </li>
          ))}
        </ul>
        <p>
          We do <span className="font-medium text-foreground">not</span> use
          advertising networks, trackers, or any service that resells your data.
        </p>
      </div>
    ),
  },
  {
    id: "your-rights",
    icon: <Trash2 className="w-5 h-5" />,
    title: "Your Rights & Data Deletion",
    content: (
      <div className="space-y-4 text-muted-foreground">
        <p>You're always in control of your data:</p>
        <ul className="space-y-3 ml-4">
          {[
            "If you never created an account, closing or refreshing the tab clears your session, and clearing your browser's local storage removes everything else QCoop kept on your device.",
            "Disconnecting Steam or Epic from within the app immediately deletes that connection — and, for Epic, its encrypted tokens — from our database.",
            "You may revoke QCoop's access from your Steam or Epic account settings directly, at any time.",
            "If you registered, you can email us to request deletion of your account and all associated data.",
          ].map((item) => (
            <li key={item} className="flex gap-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p>
          If you have any questions about your data or wish to request its
          deletion, please contact us using the details below.
        </p>
      </div>
    ),
  },
  {
    id: "contact",
    icon: <Mail className="w-5 h-5" />,
    title: "Contact",
    content: (
      <div className="space-y-4 text-muted-foreground">
        <p>
          QCoop is a student project built for a UI/UX course. If you have
          questions, concerns, or requests regarding this privacy policy, you can
          reach us at:
        </p>
        <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3 font-mono text-sm text-foreground">
          quickcoop6@gmail.com
        </div>
        <p className="text-xs">
          We will respond to all privacy-related inquiries within 30 days.
        </p>
      </div>
    ),
  },
]

export function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Animated Background — same as landing */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `linear-gradient(rgba(0,255,200,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,200,0.03) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      {/* Navigation */}
      <header className="relative z-10">
        <nav className="flex items-center justify-between px-6 py-2 lg:px-12">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Gamepad2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">QCoop</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </nav>
      </header>

      <main className="relative z-10 px-6 py-2 lg:px-12">
        <div className="max-w-3xl mx-auto">

          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
              Privacy Policy
            </h1>
            <p className="text-muted-foreground">
              Last updated:{" "}
              <span className="text-foreground font-medium">{LAST_UPDATED}</span>
            </p>
            <p className="mt-4 text-muted-foreground max-w-2xl">
              QCoop is built on the principle of minimal data collection. This
              document explains exactly what we collect, why, and how you can
              remove it at any time.
            </p>
          </div>

          {/* Table of contents */}
          <nav
            className="mb-12 rounded-xl border border-border bg-card/50 backdrop-blur p-6"
            aria-label="Table of contents"
          >
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4 font-medium">
              Contents
            </p>
            <ol className="space-y-2">
              {sections.map((section, i) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="flex items-center gap-3 text-sm text-muted-foreground hover:text-primary transition-colors group"
                  >
                    <span className="text-xs font-mono text-primary/50 group-hover:text-primary transition-colors w-5">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {/* Sections */}
          <div className="space-y-10">
            {sections.map((section, i) => (
              <section
                key={section.id}
                id={section.id}
                className="group scroll-mt-24"
                aria-labelledby={`title-${section.id}`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                    {section.icon}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-primary/50">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h2
                      id={`title-${section.id}`}
                      className="text-xl font-semibold"
                    >
                      {section.title}
                    </h2>
                  </div>
                </div>
                <div className="ml-12 rounded-xl border border-border bg-card/30 backdrop-blur p-6">
                  {section.content}
                </div>
              </section>
            ))}
          </div>

          {/* Footer note */}
          <div className="mt-16 rounded-xl border border-primary/20 bg-primary/5 px-6 py-5 text-sm text-muted-foreground">
            <p>
              This privacy policy applies to{" "}
              <span className="font-medium text-foreground">
                quickcoop.me
              </span>{" "}
              and to the QCoop browser extension, and does not cover the
              practices of any third-party services linked from this page. We
              may update this policy as the product evolves — the "Last
              updated" date at the top will always reflect the most
              recent version.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-12 lg:px-12 border-t border-border mt-12">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
              <Gamepad2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">QCoop</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Built for UI/UX Course • 2026
          </p>
        </div>
      </footer>
    </div>
  )
}
