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
import { StreamManifest } from "@/lib/lens/stream";
import { useParams } from "next/navigation";
import { initializeGroveClient } from "@/lib/lens/grove";

interface ChatMessage {
  id: string;
  sender: string;
  message: string;
  timestamp: number;
}

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
  const [reactions, setReactions] = useState({ likes: 42, hearts: 18 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [space, setSpace] = useState(DEFAULT_SPACE);
  const [manifest, setManifest] = useState<StreamManifest | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const { id } = useParams();

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

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sourceBufferRef = useRef<SourceBuffer | null>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const pollingRef = useRef<NodeJS.Timer | null>(null);
  const lastChunkIndexRef = useRef(-1);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const fetchQueueRef = useRef<Array<ArrayBuffer>>([]);
  const isAppendingRef = useRef(false);
  const [streamUri, setStreamUri] = useState("");

  function sleep(seconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  }
  const waitForMetadata = async () => {
    const video = videoRef.current!;
    while (video.readyState < 1) {
      await new Promise((r) => setTimeout(r, 50));
    }
  };

  async function initializeStream(streamUri: string) {
    try {
      setIsLoading(true);
      const storageClient = initializeGroveClient();
      const manifestUrl = storageClient.resolve(streamUri);
      const res = await fetch(manifestUrl);
      const manifest: StreamManifest = await res.json();
      setManifest(manifest);
      setSpace({
        id: streamUri,
        title: manifest.title,
        creator: manifest.creator,
        creatorAvatar: "/placeholder.svg?height=40&width=40",
        viewers: Math.floor(Math.random() * 50) + 5,
        isLive: manifest.status === "live",
      });
      setViewerCount(Math.floor(Math.random() * 50) + 5);

      const mediaSource = new MediaSource();
      mediaSourceRef.current = mediaSource;

      const video = videoRef.current!;
      video.src = URL.createObjectURL(mediaSource);
      console.log("Assigned video.src:", video.src);
      video.addEventListener("loadedmetadata", () => {
        console.log("🎥 loadedmetadata: duration =", video.duration);
      });

      video.addEventListener("canplay", () => {
        console.log("🎬 canplay: video can begin playback");
      });

      video.addEventListener("error", () => {
        const error = video.error;
        if (!error) {
          console.error("❌ video error: Unknown");
          return;
        }

        const errorMap = {
          1: "MEDIA_ERR_ABORTED",
          2: "MEDIA_ERR_NETWORK",
          3: "MEDIA_ERR_DECODE",
          4: "MEDIA_ERR_SRC_NOT_SUPPORTED",
        };

        console.error("❌ video error:", {
          code: error.code,
          name: errorMap[error.code] || "Unknown Error",
          message: error.message || "No detailed message",
        });
      });

      setTimeout(() => {
        console.log("Attempting to play video manually...");
        video.play().catch((err) => console.warn("Autoplay blocked:", err));
      }, 1000);

      mediaSource.addEventListener(
        "sourceopen",
        async () => {
          console.log(
            "MediaSource opened, readyState:",
            mediaSource.readyState
          );

          try {
            const mime = "video/webm;codecs=vp9,opus";

            if (!MediaSource.isTypeSupported(mime)) {
              throw new Error("MIME type not supported");
            }

            const sourceBuffer = mediaSource.addSourceBuffer(mime);
            sourceBufferRef.current = sourceBuffer;

            console.log(
              "SourceBuffer created. sourceBuffers.length:",
              mediaSource.sourceBuffers.length
            );
            console.log(
              "activeSourceBuffers.length:",
              mediaSource.sourceBuffers
            );

            await loadInitialChunks(
              manifest,
              sourceBuffer,
              storageClient,
              mediaSource
            );

            pollingRef.current = setInterval(
              () => pollManifestForNewChunks(streamUri),
              5000 // or shorter interval if needed
            );

            setIsLoading(false);
          } catch (err) {
            console.error("SourceBuffer setup failed:", err);
            setError("Playback initialization failed");
            setIsLoading(false);
          }
        },
        { once: true }
      );
    } catch (err: any) {
      console.error("Stream initialization error:", err);
      setError(err.message);
      setIsLoading(false);
    }
  }

  async function loadInitialChunks(
    manifest: StreamManifest,
    sourceBuffer: SourceBuffer,
    storageClient: ReturnType<typeof initializeGroveClient>,
    mediaSource: MediaSource
  ) {
    for (const chunk of manifest.chunks) {
      const chunkUrl = storageClient.resolve(chunk.uri);
      const chunkRes = await fetch(chunkUrl);
      const buffer = await chunkRes.arrayBuffer();

      await new Promise<void>((resolve) => {
        console.log("Chunk buffer size:", buffer.byteLength);
        console.log(
          "MediaSource state before append:",
          mediaSourceRef.current?.readyState
        );
        console.log(
          "SourceBuffer updating before append:",
          sourceBuffer.updating
        );

        sourceBuffer.addEventListener(
          "updateend",
          () => {
            console.log("updateend fired");
            resolve();
          },
          { once: true }
        );
        try {
          sourceBuffer.appendBuffer(buffer);
        } catch (err) {
          console.error("appendBuffer error:", err);
          resolve();
        }
      });

      lastChunkIndexRef.current = chunk.index;
    }
  }

  async function pollManifestForNewChunks(streamUri: string) {
    console.log("Polling");

    try {
      const storageClient = initializeGroveClient();
      const updatedManifestUrl = storageClient.resolve(streamUri);
      console.log(updatedManifestUrl);

      const response = await fetch(`${updatedManifestUrl}?t=${Date.now()}`, {
        cache: "no-store",
      });
      const updatedManifest: StreamManifest = await response.json();
      console.log(updatedManifest);

      const newChunks = updatedManifest.chunks.filter(
        (c) => c.index > lastChunkIndexRef.current
      );

      console.log("Found new chunks:", newChunks);

      for (const chunk of newChunks) {
        if (
          !mediaSourceRef.current ||
          mediaSourceRef.current.readyState !== "open" ||
          !sourceBufferRef.current
        ) {
          console.warn(
            "MediaSource not ready or SourceBuffer missing. Skipping chunk."
          );
          return;
        }

        const url = storageClient.resolve(chunk.uri);
        const res = await fetch(url);
        const buffer = await res.arrayBuffer();

        await new Promise<void>((resolve) => {
          sourceBufferRef.current!.addEventListener(
            "updateend",
            () => resolve(),
            { once: true }
          );
          try {
            sourceBufferRef.current!.appendBuffer(buffer);
          } catch (err) {
            console.error("appendBuffer failed during polling:", err);
            resolve();
          }
        });

        lastChunkIndexRef.current = chunk.index;
      }

      if (updatedManifest.status === "ended") {
        if (
          mediaSourceRef.current &&
          mediaSourceRef.current.readyState === "open"
        ) {
          try {
            mediaSourceRef.current.endOfStream();
          } catch (err) {
            console.warn("endOfStream error:", err);
          }
        }
        clearInterval(pollingRef.current!);
      }
    } catch (err) {
      console.error("Polling error:", err);
    }
  }

  useEffect(() => {
    if (!id) return;
    const streamUri = decodeURIComponent(id as string);

    const waitForVideoElement = async () => {
      while (!videoRef.current) {
        await new Promise((r) => setTimeout(r, 50));
      }
      initializeStream(streamUri);
    };

    waitForVideoElement();

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute("src");
        videoRef.current.load();
      }
    };
  }, [id]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleReaction = (type: "likes" | "hearts") => {
    setReactions((prev) => ({ ...prev, [type]: prev[type] + 1 }));
    toast({
      title: "Reaction Sent",
      description: `Your ${
        type === "likes" ? "like" : "heart"
      } was sent to the creator!`,
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message) return;
    setChatMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: "lens/you",
        message,
        timestamp: Date.now(),
      },
    ]);
    setMessage("");
  };

  const handleShare = () => {
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
          <div className="lg:col-span-2 space-y-6">
            <Card className="overflow-hidden shadow-soft">
              <div className="aspect-video bg-black flex items-center justify-center text-white relative">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  controls
                  autoPlay
                />
                {(isLoading || error) && (
                  <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center z-10">
                    {isLoading ? (
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-2"></div>
                        <p>Loading stream...</p>
                      </div>
                    ) : (
                      <div className="text-center p-6">
                        <p className="text-red-500 font-semibold mb-2">
                          {error}
                        </p>
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={() => window.location.reload()}
                        >
                          Try Again
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>

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
                        {space.creator[0]?.toUpperCase()}
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
                          {msg.sender[0].toUpperCase()}
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
