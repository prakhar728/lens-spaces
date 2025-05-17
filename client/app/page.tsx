"use client";

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/navbar"
import { ArrowRight, AirplayIcon as Broadcast, Coins, Shield } from "lucide-react"

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative hero-gradient">
        <div className="container max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Stream. Share. <span className="text-primary">Own the Moment.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            A decentralized streaming platform built on Lens Protocol. Create, share, and own your content without
            intermediaries.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="rounded-full shadow-soft">
              <Link href="/start">
                Start Streaming <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full shadow-soft">
              <Link href="/explore">Explore Spaces</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">Why Lens Spaces?</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-background rounded-2xl p-6 shadow-soft card-hover">
              <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <Broadcast className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Stream</h3>
              <p className="text-muted-foreground">
                Create high-quality live streams with just a few clicks. Share your passions, talents, and ideas with
                the world.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-background rounded-2xl p-6 shadow-soft card-hover">
              <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <Coins className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Monetize</h3>
              <p className="text-muted-foreground">
                Earn directly from your audience through tips, collects, and subscriptions without platform fees.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-background rounded-2xl p-6 shadow-soft card-hover">
              <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Own Content</h3>
              <p className="text-muted-foreground">
                Your content remains yours. Stored on decentralized networks, ensuring censorship resistance and true
                ownership.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Lens Spaces. Built on Lens Protocol.</p>
        </div>
      </footer>
    </main>
  )
}
