"use client"

import type React from "react"

import { useState } from "react"
import { Navbar } from "@/components/navbar"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Eye, Search, Users } from "lucide-react"
import Link from "next/link"

// Mock data for spaces
const MOCK_SPACES = [
  {
    id: "1",
    title: "Building Web3 Applications",
    creator: "lens/alice",
    viewers: 124,
    isLive: true,
    thumbnail: "/placeholder.svg?height=200&width=350",
  },
  {
    id: "2",
    title: "Music Production Masterclass",
    creator: "lens/bob",
    viewers: 87,
    isLive: true,
    thumbnail: "/placeholder.svg?height=200&width=350",
  },
  {
    id: "3",
    title: "Crypto Market Analysis",
    creator: "lens/charlie",
    viewers: 203,
    isLive: true,
    thumbnail: "/placeholder.svg?height=200&width=350",
  },
  {
    id: "4",
    title: "Digital Art Creation",
    creator: "lens/diana",
    viewers: 56,
    isLive: true,
    thumbnail: "/placeholder.svg?height=200&width=350",
  },
  {
    id: "5",
    title: "Blockchain Development",
    creator: "lens/evan",
    viewers: 142,
    isLive: true,
    thumbnail: "/placeholder.svg?height=200&width=350",
  },
  {
    id: "6",
    title: "Gaming with Friends",
    creator: "lens/frank",
    viewers: 98,
    isLive: true,
    thumbnail: "/placeholder.svg?height=200&width=350",
  },
]

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [filteredSpaces, setFilteredSpaces] = useState(MOCK_SPACES)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setFilteredSpaces(
      MOCK_SPACES.filter(
        (space) =>
          space.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          space.creator.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    )
  }

  return (
    <main className="min-h-screen pt-20 pb-10 px-4">
      <Navbar showWalletConnect />

      <div className="container max-w-6xl mx-auto mt-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold">Explore Spaces</h1>

          <form onSubmit={handleSearch} className="w-full md:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search spaces..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full md:w-[300px] rounded-full shadow-soft"
              />
            </div>
          </form>
        </div>

        <Tabs defaultValue="all" className="mb-8">
          <TabsList className="grid w-full md:w-auto grid-cols-3 md:inline-flex">
            <TabsTrigger value="all">All Spaces</TabsTrigger>
            <TabsTrigger value="trending">Trending</TabsTrigger>
            <TabsTrigger value="following">Following</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSpaces.map((space) => (
                <Link href={`/space/${space.id}`} key={space.id}>
                  <Card className="overflow-hidden shadow-soft hover:shadow-soft-lg transition-shadow card-hover">
                    <div className="relative aspect-video bg-muted">
                      <img
                        src={space.thumbnail || "/placeholder.svg"}
                        alt={space.title}
                        className="w-full h-full object-cover"
                      />
                      <Badge variant="destructive" className="absolute top-2 right-2 px-2 py-1 text-xs font-semibold">
                        LIVE
                      </Badge>
                    </div>
                    <CardContent className="pt-4">
                      <h3 className="font-semibold text-lg line-clamp-1">{space.title}</h3>
                      <p className="text-muted-foreground text-sm">{space.creator}</p>
                    </CardContent>
                    <CardFooter className="pt-0 text-sm text-muted-foreground">
                      <div className="flex items-center">
                        <Eye className="h-4 w-4 mr-1" />
                        <span>{space.viewers} viewers</span>
                      </div>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="trending" className="mt-6">
            <div className="flex items-center justify-center h-40 bg-muted/30 rounded-lg">
              <p className="text-muted-foreground">Trending spaces will appear here</p>
            </div>
          </TabsContent>

          <TabsContent value="following" className="mt-6">
            <div className="flex flex-col items-center justify-center h-40 bg-muted/30 rounded-lg">
              <p className="text-muted-foreground mb-2">Connect your wallet to see spaces from creators you follow</p>
              <Button variant="outline" className="rounded-full shadow-soft">
                <Users className="mr-2 h-4 w-4" /> Connect Wallet
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
