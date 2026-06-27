"use client"

import { Gamepad2, ArrowLeft, Shield, Eye, Database, Trash2, Mail } from "lucide-react"
import Link from "next/link"

const LAST_UPDATED = "May 23, 2026"

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
          QCoop collects only the minimum information necessary to provide game
          matching between you and your friends. We collect:
        </p>
        <ul className="space-y-3 ml-4">
          {[
            {
              label: "Steam Account Data",
              detail:
                "Your Steam ID, public game library, and friends list — obtained through Steam OpenID authentication. We never store your Steam password.",
            },
            {
              label: "Epic Games Account Data",
              detail:
                "Your Epic Account ID and display name — obtained through Epic OAuth 2.0. We access only the basic_profile scope.",
            },
            {
              label: "Xbox / Game Pass Status",
              detail:
                "A self-reported indicator of whether you hold an active Game Pass subscription. No Xbox account credentials are stored.",
            },
            {
              label: "Session Data",
              detail:
                "Temporary identifiers stored in your browser's sessionStorage to keep you authenticated during a single visit. This data is erased when you close the tab.",
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
          payment information, email addresses, real names, or any data beyond
          what is listed above.
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
            "Caching trending game data locally in your browser to reduce load times.",
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
          QCoop is designed with a minimal data footprint:
        </p>
        <ul className="space-y-3 ml-4">
          {[
            "Account identifiers (Steam ID, Epic Account ID) are stored only in your browser's sessionStorage and are never persisted to a database or server.",
            "Trending game data is cached in localStorage on your device for up to 24 hours to reduce redundant network requests.",
            "No cookies containing personal data are set beyond the temporary OAuth state token used to prevent CSRF attacks during the login flow. This cookie expires within 10 minutes.",
            "All communication between your browser and our servers uses HTTPS.",
          ].map((item) => (
            <li key={item} className="flex gap-3">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: "your-rights",
    icon: <Trash2 className="w-5 h-5" />,
    title: "Your Rights & Data Deletion",
    content: (
      <div className="space-y-4 text-muted-foreground">
        <p>
          Because QCoop does not persist personal data to a server-side database,
          you have full control over your data at all times:
        </p>
        <ul className="space-y-3 ml-4">
          {[
            "Closing or refreshing the browser tab clears all sessionStorage data, effectively disconnecting your accounts.",
            "You can clear localStorage (trending cache) through your browser's developer tools or privacy settings.",
            "You may revoke QCoop's access to your Steam account from your Steam account settings at any time.",
            "You may revoke QCoop's access to your Epic account from your Epic account connection settings at any time.",
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
              This privacy policy applies solely to{" "}
              <span className="font-medium text-foreground">
                quickcoop.vercel.app
              </span>{" "}
              and does not cover the practices of any third-party services linked
              from this page. We may update this policy as the product evolves —
              the "Last updated" date at the top will always reflect the most
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
