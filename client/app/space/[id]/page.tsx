"use client";
import { useState, useEffect, useRef } from "react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageSquare, Share2, ThumbsUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { StreamPlayer, StreamManifest } from "@/lib/lens/stream";
import { useParams } from "next/navigation";

// Chat message type
interface ChatMessage {
  id: string;
  sender: string;
  message: string;
  timestamp: number;
}

// Default space info while loading
const DEFAULT_SPACE = {
  id: "loading",
  title: "Loading Stream...",
  creator: "lens/loading",
  creatorAvatar: "/placeholder.svg?height=40&width=40",
  viewers: 0,
  isLive: true,
};

export default function SpacePage() {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [reactions, setReactions] = useState({
    likes: 42,
    hearts: 18,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [space, setSpace] = useState(DEFAULT_SPACE);
  const [manifest, setManifest] = useState<StreamManifest | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const {id} = useParams()

  // Chat messages state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      sender: "lens/bob",
      message: "This is amazing content! Thanks for sharing.",
      timestamp: Date.now() - 5000,
    },
    {
      id: "2",
      sender: "lens/charlie",
      message: "Could you explain more about the Web3 authentication?",
      timestamp: Date.now() - 3000,
    },
    {
      id: "3",
      sender: "lens/diana",
      message: "Just sent you a tip! Keep up the great work.",
      timestamp: Date.now() - 1000,
    },
  ]);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<StreamPlayer | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  // Decode the stream URI from the URL parameter
  const streamUri = decodeURIComponent(id);
  console.log(streamUri);
  
  // Initialize player and load stream
  useEffect(() => {
    async function initializePlayer() {
      if (!videoRef.current) return;

      try {
        setIsLoading(true);

        // Create stream player
        const player = new StreamPlayer(videoRef.current, streamUri, {
          autoPlay: true,
          muted: true,
          controls: true,
          pollingInterval: 2000,
        });

        // Set up manifest loaded callback
        player.onManifestLoaded((loadedManifest) => {
          setManifest(loadedManifest);

          // Update space info from manifest
          setSpace({
            id: streamUri,
            title: loadedManifest.title,
            creator: loadedManifest.creator,
            creatorAvatar: "/placeholder.svg?height=40&width=40", // Default avatar
            viewers: Math.floor(Math.random() * 50) + 5, // Simulate viewer count
            isLive: loadedManifest.status === "live",
          });

          // Set viewer count
          setViewerCount(Math.floor(Math.random() * 50) + 5);
        });

        // Set up stream ended callback
        player.onStreamEnded(() => {
          // Update space status when stream ends
          setSpace((prev) => ({
            ...prev,
            isLive: false,
          }));

          toast({
            title: "Stream Ended",
            description: "The stream has ended",
          });
        });

        // Set up error callback
        player.onError((playerError) => {
          setError(playerError.message);
          console.error("Player error:", playerError);
        });

        // Initialize player
        await player.initialize();

        // Store player reference
        playerRef.current = player;
      } catch (error) {
        console.error("Error initializing player:", error);
        setError("Failed to load the stream. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    }

    initializePlayer();

    // Cleanup on unmount
    return () => {
      if (playerRef.current) {
        playerRef.current.stop();
      }
    };
  }, [streamUri]);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Handle reaction
  const handleReaction = (type: "likes" | "hearts") => {
    setReactions((prev) => ({
      ...prev,
      [type]: prev[type] + 1,
    }));

    toast({
      title: "Reaction Sent",
      description: `Your ${
        type === "likes" ? "like" : "heart"
      } was sent to the creator!`,
    });
  };

  // Handle sending a chat message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message) return;

    // In a real app, this would send the message to a backend
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: "lens/you", // Replace with actual user handle
      message,
      timestamp: Date.now(),
    };

    // Add to local chat
    setChatMessages((prev) => [...prev, newMessage]);

    // Clear input
    setMessage("");
  };

  // Format the sender's name (extract from lens/username format)
  const formatSender = (sender: string) => {
    if (sender.startsWith("lens/")) {
      return sender.split("/")[1];
    }
    return sender;
  };

  // Handle sharing the stream
  const handleShare = () => {
    // Copy to clipboard
    navigator.clipboard.writeText(window.location.href).then(() => {
      toast({
        title: "Link Copied",
        description: "Stream link copied to clipboard",
      });
    });
  };

  return (
    <main className="min-h-screen pt-20 pb-10 px-4">
      <Navbar showWalletConnect />
      <div className="container max-w-6xl mx-auto mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Video Player and Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video Player */}
            <Card className="overflow-hidden shadow-soft">
              <div className="aspect-video bg-black flex items-center justify-center text-white relative">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-2"></div>
                    <p>Loading stream...</p>
                  </div>
                ) : error ? (
                  <div className="text-center p-6">
                    <p className="text-red-500 font-semibold mb-2">{error}</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => window.location.reload()}
                    >
                      Try Again
                    </Button>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      controls
                    />

                    {/* Status indicator */}
                    {space.isLive && (
                      <div className="absolute top-4 left-4">
                        <div className="flex items-center gap-2 bg-black/50 px-3 py-1 rounded-full">
                          <div className="animate-pulse text-red-500">●</div>
                          <span className="text-sm font-medium">LIVE</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Card>

            {/* Stream Info */}
            <Card className="shadow-soft">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage
                        src={space.creatorAvatar || "/placeholder.svg"}
                        alt={space.creator}
                      />
                      <AvatarFallback>
                        {formatSender(space.creator)[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold">{space.title}</h1>
                        {space.isLive ? (
                          <Badge
                            variant="destructive"
                            className="px-2 py-1 text-xs font-semibold"
                          >
                            LIVE
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="px-2 py-1 text-xs font-semibold"
                          >
                            ENDED
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground">{space.creator}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {viewerCount} viewers
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full shadow-soft"
                      onClick={handleShare}
                    >
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
                  <Button className="flex-1 rounded-full shadow-soft">
                    Tip Creator
                  </Button>
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
                    {viewerCount} online
                  </Badge>
                </div>
                <div
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto mb-4 space-y-4"
                >
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className="flex items-start gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {formatSender(msg.sender)[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{msg.sender}</p>
                        <p className="text-sm">{msg.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleSendMessage} className="mt-auto">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="rounded-full shadow-soft"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      className="rounded-full shadow-soft"
                    >
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
  );
}
