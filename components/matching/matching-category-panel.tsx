import { CategoryFilterMode } from "@/types"
import { Button } from "../ui/button"
import { Spinner } from "../ui/spinner"
import { Trash } from "lucide-react"

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
    <div className="p-3 text-quaternary/80">
      <div className="flex flex-wrap flex-col items-center justify-between gap-2">
        <p className="text-xs font-medium text-white/80">Category filters</p>
        {isLoadingCategories && <Spinner className="h-6 w-6" />}

        <div className="flex items-center gap-2 justify-center">
          <div className="inline-flex overflow-hidden rounded-md border border-border/80 bg-background/70 text-[10px] uppercase tracking-wide">
            <button
              type="button"
              className={`px-2 py-1 transition-colors 
                      ${categoryFilterMode === "or" 
                        ? "bg-primary/30 text-secondary" 
                        : "text-secondary/80"}
              `}
              onClick={() => onSetCategoryFilterMode("or")}
            >
              ANY
            </button>
            <button
              type="button"
              className={`border-l border-border/80 px-2 py-1 transition-colors 
                        ${categoryFilterMode === "and" 
                          ? "bg-primary/30 text-secondary" 
                          : "text-secondary/80"}
              `}
              onClick={() => onSetCategoryFilterMode("and")}
            >
              ALL
            </button>
          </div>

          {selectedCategories.length > 0 && (
            <Button type="button" size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={onClearFilters}>
              <Trash />
              Clear filters
            </Button>
          )}
        </div>

        {selectedCategories.length > 1 && (
          <p className="text-[10px] text-muted-foreground">
            Current mode: {categoryFilterMode.toUpperCase()} ({categoryFilterMode === "or" ? "matches any selected category" : "must match all selected categories"})
          </p>
        )}
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
                className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wide transition-colors 
                          ${selected 
                            ? "border-tertiary/80 bg-tertiary/25 text-quaternary" 
                            : "border-border bg-background/70 hover:text-quaternary hover:bg-tertiary/10"}
                `}
              >
                {category}
              </button>
            )
          })
        ) : (
          <p className="text-[11px] text-muted-foreground">No category data available yet for the visible games.</p>
        )}
      </div>

      
    </div>
  )
}