"use client"

import dynamic from "next/dynamic"
import { ArrowLeft, SlidersHorizontal } from "lucide-react"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useFilter } from "@/lib/filter-context"

const FilterPanel = dynamic(
  () => import("@/components/layout/filter-panel").then((mod) => mod.FilterPanel),
  { ssr: false }
)

interface FilterModalProps {
  isOpen: boolean
  onClose: () => void
}

export function FilterModal({ isOpen, onClose }: FilterModalProps) {
  const { resetFiltersAndLocation } = useFilter()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 p-0 lg:hidden sm:h-auto sm:max-h-[90vh] sm:max-w-[560px] sm:rounded-3xl sm:border">
        <DialogHeader className="border-b border-border px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-10 w-10 rounded-xl"
              aria-label="Bezárás"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <SlidersHorizontal className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="truncate text-left">Keresés és szűrés</DialogTitle>
                <p className="text-sm text-muted-foreground">Állítsd be a releváns keresési feltételeket.</p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <FilterPanel />
        </div>

        <DialogFooter className="mt-auto border-t border-border bg-background px-4 py-4 sm:px-6">
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={resetFiltersAndLocation} className="w-full sm:w-auto">
              Visszaállítás
            </Button>
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Vissza
            </Button>
            <Button onClick={onClose} className="w-full sm:w-auto">
              Szűrés alkalmazása
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
