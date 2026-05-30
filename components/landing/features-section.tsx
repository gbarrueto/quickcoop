import { LANDING_FEATURES } from "./constants"
import { Card, CardContent } from "@/components/ui/card"

export function FeaturesSection() {
  return (
    <section id="features" className="px-6 py-20 lg:px-12" aria-labelledby="features-title">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 id="features-title" className="text-3xl md:text-4xl font-bold mb-4">
            Everything You Need
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Powerful features to help you and your friends find the perfect game
          </p>
        </div>
        <ul className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {LANDING_FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <li key={feature.title}>
                <Card className="group h-full bg-card/50 backdrop-blur border-border rounded-xl hover:border-primary/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,255,200,0.1)] py-6">
                  <CardContent className="px-6">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
