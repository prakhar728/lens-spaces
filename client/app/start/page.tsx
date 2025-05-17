"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Navbar } from "@/components/navbar"
import { Card, CardContent } from "@/components/ui/card"
import { Share, StopCircle } from "lucide-react"

export default function StartSpace() {
  const [title, setTitle] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [uploadStatus, setUploadStatus] = useState(0)

  const startStream = () => {
    if (!title) return
    setIsStreaming(true);

    // create a editable lens URI with JSON structure.
    // Then every chunk (approx less than 8MB) should be uploaded to groove storage - and then edited into the JSON structure. 
    // All this should happen instantly.
   

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadStatus((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          return 100
        }
        return prev + 5
      })
    }, 500)
  }

  const endStream = () => {
    setIsStreaming(false)
    setUploadStatus(0)
  }

  return (
    <main className="min-h-screen pt-20 pb-10 px-4">
      <Navbar showWalletConnect />

      <div className="container max-w-3xl mx-auto mt-8">
        <h1 className="text-3xl font-bold mb-8 text-center">Start a Space</h1>

        {!isStreaming ? (
          <Card className="shadow-soft">
            <CardContent className="pt-6">
              <form
                className="space-y-6"
                onSubmit={(e) => {
                  e.preventDefault()
                  startStream()
                }}
              >
                <div className="space-y-2">
                  <Input
                    placeholder="Give your stream a title..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-lg py-6"
                    required
                  />
                </div>

                <Button type="submit" size="lg" className="w-full rounded-full shadow-soft" disabled={!title}>
                  Start Stream
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="shadow-soft overflow-hidden">
              <div className="aspect-video bg-black flex items-center justify-center text-white">
                {/* This would be replaced with actual video preview */}
                <div className="text-center">
                  <div className="animate-pulse text-red-500 mb-2">● LIVE</div>
                  <p>Your stream preview</p>
                </div>
              </div>

              <CardContent className="pt-6">
                <h2 className="text-xl font-semibold mb-4">{title}</h2>

                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-sm">
                    <span>Grove Upload</span>
                    <span>{uploadStatus}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full" style={{ width: `${uploadStatus}%` }}></div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button variant="destructive" className="flex-1 rounded-full shadow-soft" onClick={endStream}>
                    <StopCircle className="mr-2 h-4 w-4" /> End Stream
                  </Button>
                  <Button variant="outline" className="flex-1 rounded-full shadow-soft">
                    <Share className="mr-2 h-4 w-4" /> Share
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="text-center text-sm text-muted-foreground">
              <p>Your stream is being stored on decentralized storage via Grove.</p>
              <p>This ensures your content remains censorship-resistant and truly yours.</p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
