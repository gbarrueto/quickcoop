import { LANDING_STATS } from "./constants"

export function StatsSection() {
  return (
    <section id="how-it-works" className="px-6 py-20 lg:px-12 border-y border-border" aria-labelledby="stats-title">
      <div className="max-w-7xl mx-auto">
        <h2 id="stats-title" className="sr-only">
          Platform stats
        </h2>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {LANDING_STATS.map((stat) => (
            <div key={stat.label}>
              <dt className="text-muted-foreground text-sm">{stat.label}</dt>
              <dd className="text-3xl md:text-4xl font-bold text-primary mb-2">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
