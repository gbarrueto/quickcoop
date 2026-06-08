import { CategoryFilterMode } from "@/types"
import { Button } from "../ui/button"

type CategoryFiltersPanelProps = {
  availableCategories: string[]
  selectedCategories: string[]
  categoryFilterMode: CategoryFilterMode
  isLoadingCategories: boolean
  categoryFilterError: string | null
  onToggleCategory: (category: string) => void
  onSetCategoryFilterMode: (mode: CategoryFilterMode) => void
  onClearFilters: () => void
}

export function CategoryFiltersPanel({
  availableCategories,
  selectedCategories,
  categoryFilterMode,
  isLoadingCategories,
  categoryFilterError,
  onToggleCategory,
  onSetCategoryFilterMode,
  onClearFilters,
}: CategoryFiltersPanelProps) {
  return (
    <div className="rounded-xl border border-border/70 bg-background/40 p-3">
      <div className="flex flex-wrap flex-col items-center justify-between gap-2">
        <p className="text-xs font-medium">Category filters</p>
        <div className="flex items-center gap-2">
          {isLoadingCategories && <p className="text-[11px] text-primary">Loading categories...</p>}
          <div className="inline-flex overflow-hidden rounded-md border border-border/80 bg-background/70 text-[10px] uppercase tracking-wide">
            <button
              type="button"
              className={`px-2 py-1 transition-colors ${categoryFilterMode === "or" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => onSetCategoryFilterMode("or")}
            >
              ANY
            </button>
            <button
              type="button"
              className={`border-l border-border/80 px-2 py-1 transition-colors ${categoryFilterMode === "and" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => onSetCategoryFilterMode("and")}
            >
              ALL
            </button>
          </div>

          {selectedCategories.length > 0 && (
            <Button type="button" size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={onClearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {categoryFilterError && <p className="mt-2 text-[11px] text-destructive">{categoryFilterError}</p>}

      <div className="mt-2 flex flex-wrap gap-2 flex-col">
        {availableCategories.length > 0 ? (
          availableCategories.map((category) => {
            const selected = selectedCategories.includes(category)
            return (
              <button
                key={category}
                type="button"
                onClick={() => onToggleCategory(category)}
                className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wide transition-colors ${selected ? "border-primary bg-primary/15 text-primary" : "border-border bg-background/70 text-muted-foreground hover:text-foreground"}`}
              >
                {category}
              </button>
            )
          })
        ) : (
          <p className="text-[11px] text-muted-foreground">No category data available yet for the visible games.</p>
        )}
      </div>

      {selectedCategories.length > 1 && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Current mode: {categoryFilterMode.toUpperCase()} ({categoryFilterMode === "or" ? "matches any selected category" : "must match all selected categories"})
        </p>
      )}
    </div>
  )
}