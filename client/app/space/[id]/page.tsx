"use client"

import type React from "react"

import { useState } from "react"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Heart, MessageSquare, Share2, ThumbsUp } from "lucide-react"
import { Input } from "@/components/ui/input"

// Mock data for a space
const MOCK_SPACE = {
  id: "1",
  title: "Building Web3 Applications",
  creator: "lens/alice",
  creatorAvatar: "/placeholder.svg?height=40&width=40",
  viewers: 124,
  isLive: true,
}

export default function SpacePage({ params }: { params: { id: string } }) {
  const [message, setMessage] = useState("")
  const [reactions, setReactions] = useState({
    likes: 42,
    hearts: 18,
  })

  const handleReaction = (type: "likes" | "hearts") => {
    setReactions((prev) => ({
      ...prev,
      [type]: prev[type] + 1,
    }))
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message) return
    // In a real app, this would send the message to a backend
    setMessage("")
  }

  return (
    <main className="min-h-screen pt-20 pb-10 px-4">
      <Navbar showWalletConnect />

      <div className="container max-w-6xl mx-auto mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Video Player and Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video Player */}
            <Card className="overflow-hidden shadow-soft">
              <div className="aspect-video bg-black flex items-center justify-center text-white">
                {/* This would be replaced with actual video player */}
                <div className="text-center">
                  <div className="animate-pulse text-red-500 mb-2">● LIVE</div>
                  <p>Stream content for Space #{params.id}</p>
                </div>
              </div>
            </Card>

            {/* Stream Info */}
            <Card className="shadow-soft">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={MOCK_SPACE.creatorAvatar || "/placeholder.svg"} alt={MOCK_SPACE.creator} />
                      <AvatarFallback>{MOCK_SPACE.creator[0]}</AvatarFallback>
                    </Avatar>

                    <div>
                      <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold">{MOCK_SPACE.title}</h1>
                        <Badge variant="destructive" className="px-2 py-1 text-xs font-semibold">
                          LIVE
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">{MOCK_SPACE.creator}</p>
                      <p className="text-sm text-muted-foreground mt-1">{MOCK_SPACE.viewers} viewers</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="rounded-full shadow-soft">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-full shadow-soft"
                    onClick={() => handleReaction("likes")}
                  >
                    <ThumbsUp className="mr-2 h-4 w-4" /> {reactions.likes}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 rounded-full shadow-soft"
                    onClick={() => handleReaction("hearts")}
                  >
                    <Heart className="mr-2 h-4 w-4" /> {reactions.hearts}
                  </Button>
                  <Button className="flex-1 rounded-full shadow-soft">Tip Creator</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Chat */}
          <div className="space-y-6">
            <Card className="shadow-soft h-[calc(100vh-200px)] flex flex-col">
              <CardContent className="pt-6 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">Live Chat</h2>
                  <Badge variant="outline" className="px-2 py-1 text-xs">
                    {MOCK_SPACE.viewers} online
                  </Badge>
                </div>

                <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                  {/* Chat messages would go here */}
                  <div className="flex items-start gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>B</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">lens/bob</p>
                      <p className="text-sm">This is amazing content! Thanks for sharing.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>C</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">lens/charlie</p>
                      <p className="text-sm">Could you explain more about the Web3 authentication?</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>D</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">lens/diana</p>
                      <p className="text-sm">Just sent you a tip! Keep up the great work.</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSendMessage} className="mt-auto">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="rounded-full shadow-soft"
                    />
                    <Button type="submit" size="icon" className="rounded-full shadow-soft">
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}
