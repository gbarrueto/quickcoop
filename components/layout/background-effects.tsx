export function BackgroundEffects() {
  return (
    <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `linear-gradient(rgba(0,255,200,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,200,0.03) 1px, transparent 1px)`,
          backgroundSize: "50px 50px",
        }}
      />
    </div>
  )
}
