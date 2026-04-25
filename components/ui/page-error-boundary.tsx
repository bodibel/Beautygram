"use client"

import React from "react"
import { Button } from "@/components/ui/button"

type Props = {
  title?: string
  description?: string
  children: React.ReactNode
}

type State = {
  hasError: boolean
}

export class PageErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.error("PageErrorBoundary caught an error:", error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-bold text-gray-900">{this.props.title || "Valami hiba történt"}</h2>
          <p className="mt-2 text-sm text-gray-500">
            {this.props.description || "Az oldal egy része nem tudott biztonságosan betöltődni."}
          </p>
          <Button className="mt-5 rounded-xl" variant="outline" onClick={() => this.setState({ hasError: false })}>
            Újrapróbálás
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
