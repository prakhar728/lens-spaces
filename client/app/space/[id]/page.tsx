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

  console.log(mediaSourceRef.current);
  
  // Improved process queue function with better error handling and logging
  function processQueue() {
    const sourceBuffer = sourceBufferRef.current;
    const mediaSource = mediaSourceRef.current;

    if (!sourceBuffer || !mediaSource) {
      console.warn("SourceBuffer or MediaSource not available in processQueue");
      return;
    }

    if (mediaSource.readyState !== "open") {
      console.warn(
        `MediaSource not open in processQueue (state: ${mediaSource.readyState}), retrying shortly...`
      );
      setTimeout(processQueue, 100);
      return;
    }

    if (sourceBuffer.updating) {
      console.log("SourceBuffer already updating, waiting for updateend event");
      // Already updating, the updateend event will trigger processQueue again
      return;
    }

    if (fetchQueueRef.current.length === 0) {
      // Nothing to process
      return;
    }

    const buffer = fetchQueueRef.current.shift();
    if (buffer) {
      try {
        console.log(`Appending buffer of size: ${buffer.byteLength} bytes`);
        isAppendingRef.current = true;
        sourceBuffer.appendBuffer(buffer);
        // processQueue will be called again by the updateend event
      } catch (err) {
        console.error("appendBuffer failed:", err);
        isAppendingRef.current = false;

        // Handle specific types of errors
        if (err.name === "QuotaExceededError") {
          console.log("QuotaExceededError - removing early buffer data");
          // Remove some early buffer data before trying again
          const removeStart = 0;
          const removeEnd = videoRef.current?.currentTime || 1;
          try {
            sourceBuffer.remove(removeStart, removeEnd);
            console.log(`Removed buffer from ${removeStart} to ${removeEnd}`);
            // Put the buffer back at the front of the queue to try again
            fetchQueueRef.current.unshift(buffer);
          } catch (removeErr) {
            console.error("Buffer removal failed:", removeErr);
          }
        } else if (err.name === "InvalidStateError") {
          console.log(
            "InvalidStateError - buffer operation not valid in current state, retrying later"
          );
          // For state errors, just retry later
          setTimeout(() => {
            fetchQueueRef.current.unshift(buffer);
            processQueue();
          }, 500);
        } else {
          // For other errors, retry after a short delay
          console.log(`Other error (${err.name}) - retrying after delay`);
          setTimeout(() => {
            fetchQueueRef.current.unshift(buffer);
            processQueue();
          }, 1000);
        }
      }
    }
  }

  // Improved chunk fetching with better error handling and logging
  async function fetchAndAppendChunk(uri: string, retryCount = 0) {
    const MAX_RETRIES = 3;

    try {
      const storageClient = initializeGroveClient();
      const url = storageClient.resolve(uri);
      console.log(`Fetching chunk: ${url} (attempt ${retryCount + 1})`);

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch chunk: ${res.status}`);
      }

      const data = await res.arrayBuffer();
      console.log(`Chunk fetched successfully, size: ${data.byteLength} bytes`);

      if (!mediaSourceRef.current) {
        console.error("MediaSource not available when trying to queue chunk");
        if (retryCount < MAX_RETRIES) {
          setTimeout(() => fetchAndAppendChunk(uri, retryCount + 1), 1000);
        }
        return;
      }

      // Check if MediaSource is open, if not try to wait a bit
      if (mediaSourceRef.current.readyState !== "open") {
        console.warn(
          `MediaSource not open (state: ${mediaSourceRef.current.readyState}), waiting...`
        );

        // Instead of giving up immediately, try waiting for the open state
        if (retryCount < MAX_RETRIES) {
          await new Promise<void>((resolve) => {
            // If already open, resolve immediately
            if (mediaSourceRef.current?.readyState === "open") {
              resolve();
              return;
            }

            // Set up a one-time event listener for sourceopen
            const onSourceOpen = () => {
              console.log("MediaSource opened during retry");
              mediaSourceRef.current?.removeEventListener(
                "sourceopen",
                onSourceOpen
              );
              resolve();
            };

            // Also resolve after timeout in case event doesn't fire
            const timeoutId = setTimeout(() => {
              if (mediaSourceRef.current) {
                mediaSourceRef.current.removeEventListener(
                  "sourceopen",
                  onSourceOpen
                );
              }
              resolve();
            }, 1000);

            if (mediaSourceRef.current) {
              mediaSourceRef.current.addEventListener(
                "sourceopen",
                onSourceOpen,
                { once: true }
              );
            }
          });

          // Check again after waiting
          if (
            !mediaSourceRef.current ||
            mediaSourceRef.current.readyState !== "open"
          ) {
            console.warn(
              `MediaSource still not open after waiting, retrying chunk fetch later...`
            );
            setTimeout(() => fetchAndAppendChunk(uri, retryCount + 1), 1000);
            return;
          }
        } else {
          console.error(
            `MediaSource still not open after ${MAX_RETRIES} retries`
          );
          return;
        }
      }

      console.log(
        `Adding chunk to queue, queue length: ${fetchQueueRef.current.length}`
      );
      fetchQueueRef.current.push(data);
      if (!isAppendingRef.current) {
        processQueue();
      }
    } catch (err) {
      console.error(`Error fetching chunk:`, err);
      if (retryCount < MAX_RETRIES) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 5000); // Exponential backoff
        console.log(
          `Retrying chunk fetch (${
            retryCount + 1
          }/${MAX_RETRIES}) after ${delay}ms...`
        );
        setTimeout(() => fetchAndAppendChunk(uri, retryCount + 1), delay);
      }
    }
  }

  // Improved polling function with error handling
  async function pollManifestForNewChunks() {
    if (!manifest) return;

    try {
      const storageClient = initializeGroveClient();
      const updatedManifestUrl = storageClient.resolve(streamUri);
      const response = await fetch(updatedManifestUrl);

      if (!response.ok) {
        throw new Error(`Failed to fetch updated manifest: ${response.status}`);
      }

      const updatedManifest: StreamManifest = await response.json();
      setManifest(updatedManifest);

      const newChunks = updatedManifest.chunks.filter(
        (c) => c.index > lastChunkIndexRef.current
      );

      // Process chunks sequentially to maintain order
      for (const chunk of newChunks) {
        await fetchAndAppendChunk(chunk.uri);
        lastChunkIndexRef.current = chunk.index;
      }

      if (updatedManifest.status === "ended") {
        if (pollingRef.current) clearInterval(pollingRef.current);
        if (
          mediaSourceRef.current &&
          mediaSourceRef.current.readyState === "open"
        ) {
          mediaSourceRef.current.endOfStream();
        }
        setSpace((prev) => ({ ...prev, isLive: false }));
        toast({ title: "Stream Ended", description: "The stream has ended" });
      }
    } catch (err) {
      console.error("Error polling manifest:", err);
      // Don't cancel polling on error, just let it try again next interval
    }
  }

  // Improved stream initialization with better MediaSource handling
  async function initializeStreamPlayback() {
    try {
      const streamUri = decodeURIComponent(id as string);
      setStreamUri(streamUri);
      setIsLoading(true);

      const storageClient = initializeGroveClient();
      const manifestUrl = storageClient.resolve(streamUri);

      const response = await fetch(manifestUrl);
      if (!response.ok)
        throw new Error(`Failed to fetch manifest: ${response.status}`);

      const data: StreamManifest = await response.json();
      setManifest(data);
      setSpace({
        id: streamUri,
        title: data.title || "Untitled Stream",
        creator: data.creator || "Unknown Creator",
        creatorAvatar: "/placeholder.svg?height=40&width=40",
        viewers: Math.floor(Math.random() * 50) + 5,
        isLive: data.status === "live",
      });
      setViewerCount(Math.floor(Math.random() * 50) + 5);

      if (!videoRef.current) {
        throw new Error("Video element not found");
      }

      // Clear any existing MediaSource
      if (mediaSourceRef.current) {
        if (videoRef.current) videoRef.current.src = "";
        mediaSourceRef.current = null;
        sourceBufferRef.current = null;
      }

      // Create and initialize the MediaSource with proper event handling
      const mediaSource = new MediaSource();
      mediaSourceRef.current = mediaSource;

      console.log("Creating new MediaSource object");

      // Wait for the video element to be ready for a source
      await new Promise<void>((resolve) => {
        // Ensure video element is properly reset first
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.removeAttribute("src");
          videoRef.current.load();
        }
        setTimeout(resolve, 100);
      });

      // Now attach the MediaSource to the video element
      if (!videoRef.current)
        throw new Error("Video element lost during initialization");
      const objectUrl = URL.createObjectURL(mediaSource);
      videoRef.current.src = objectUrl;

      console.log("MediaSource attached to video element:", objectUrl);

      // Handle source opening with proper logging and extended timeout
      await new Promise<void>((resolve, reject) => {
        // Check if the MediaSource is already open
        if (mediaSource.readyState === "open") {
          console.log("MediaSource already in 'open' state");
          resolve();
          return;
        }

        console.log("Waiting for MediaSource 'sourceopen' event...");
        let timeoutId: NodeJS.Timeout;

        const onSourceOpen = () => {
          console.log(
            "MediaSource 'sourceopen' event fired, readyState:",
            mediaSource.readyState
          );
          clearTimeout(timeoutId);
          mediaSource.removeEventListener("sourceopen", onSourceOpen);
          resolve();
        };

        // Set timeout with longer duration
        timeoutId = setTimeout(() => {
          mediaSource.removeEventListener("sourceopen", onSourceOpen);
          console.error(
            "MediaSource sourceopen timed out, readyState:",
            mediaSource.readyState
          );
          reject(new Error("MediaSource sourceopen timed out"));
        }, 10000); // Extended to 10 seconds

        mediaSource.addEventListener("sourceopen", onSourceOpen);
      });

      // Add source buffer with proper error handling
      try {
        // First check if the MediaSource is actually open
        if (mediaSource.readyState !== "open") {
          console.error("Cannot add SourceBuffer - MediaSource not open");
          throw new Error(
            "MediaSource not in open state when adding SourceBuffer"
          );
        }

        // Try multiple MIME types if the first one fails
        let sourceBuffer: SourceBuffer | null = null;
        const mimeTypes = [
          "video/webm;codecs=vp8,opus",
          "video/webm;codecs=vp9,opus",
          "video/webm",
          "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
          "video/mp4",
        ];

        let lastError = null;
        for (const mimeType of mimeTypes) {
          try {
            console.log(
              `Trying to add SourceBuffer with MIME type: ${mimeType}`
            );
            if (!MediaSource.isTypeSupported(mimeType)) {
              console.warn(`MIME type ${mimeType} is not supported`);
              continue;
            }

            sourceBuffer = mediaSource.addSourceBuffer(mimeType);
            console.log(`SourceBuffer added with MIME type: ${mimeType}`);
            break;
          } catch (err) {
            console.warn(
              `Failed to add SourceBuffer with MIME type ${mimeType}:`,
              err
            );
            lastError = err;
          }
        }

        if (!sourceBuffer) {
          throw (
            lastError ||
            new Error("Could not add SourceBuffer with any supported MIME type")
          );
        }

        sourceBufferRef.current = sourceBuffer;

        // Set up updateend event with proper error handling
        sourceBuffer.addEventListener("updateend", () => {
          console.log("SourceBuffer updateend event fired");
          isAppendingRef.current = false;
          processQueue();
        });

        sourceBuffer.addEventListener("error", (event) => {
          console.error("SourceBuffer error event:", event);
          isAppendingRef.current = false;
        });

        sourceBuffer.addEventListener("abort", (event) => {
          console.warn("SourceBuffer abort event:", event);
          isAppendingRef.current = false;
        });

        // Fetch initial chunks with shorter initial delay and better error handling
        console.log("Starting to fetch initial chunks");
        const initialChunks = Math.min(3, data.chunks.length);
        for (let i = 0; i < initialChunks; i++) {
          const chunk = data.chunks[i];
          console.log(
            `Fetching initial chunk ${i + 1}/${initialChunks} (index ${
              chunk.index
            })`
          );
          await fetchAndAppendChunk(chunk.uri);
          lastChunkIndexRef.current = chunk.index;

          // Only add a small delay after first chunk - allows playback to start sooner
          if (i === 0 && initialChunks > 1) {
            console.log(
              "Short delay after first chunk to allow playback to start"
            );
            await new Promise((resolve) => setTimeout(resolve, 500));

            // Try to play the video after first chunk is loaded
            if (videoRef.current) {
              try {
                const playPromise = videoRef.current.play();
                if (playPromise) {
                  playPromise.catch((err) => {
                    console.warn(
                      "Auto-play failed, may need user interaction:",
                      err
                    );
                  });
                }
              } catch (err) {
                console.warn("Error trying to auto-play:", err);
              }
            }
          }
        }

        // Start fetching remaining chunks
        for (let i = 3; i < data.chunks.length; i++) {
          const chunk = data.chunks[i];
          fetchAndAppendChunk(chunk.uri);
          lastChunkIndexRef.current = chunk.index;
        }

        // Set up polling for live streams
        if (data.status === "live") {
          pollingRef.current = setInterval(pollManifestForNewChunks, 2000);
        } else {
          // For VOD, end the stream after all chunks are processed
          const checkIfDone = setInterval(() => {
            if (fetchQueueRef.current.length === 0 && !isAppendingRef.current) {
              clearInterval(checkIfDone);
              mediaSource.endOfStream();
            }
          }, 1000);
        }
      } catch (err) {
        console.error("Error setting up source buffer:", err);
        throw err;
      }
    } catch (err) {
      console.error("Stream error:", err);
      setError(`Unable to load stream: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }

  // In your SpacePage component, replace the useEffect that watches for id changes with this:
useEffect(() => {
  if (!id) return;
  
  // Clean up previous state
  if (pollingRef.current) clearInterval(pollingRef.current);
  if (videoRef.current) {
    videoRef.current.pause();
    videoRef.current.src = "";
    videoRef.current.load();
  }
  
  // Initialize with a slight delay to ensure DOM is ready
  setTimeout(() => {
    // Directly create MediaSource in the effect
    const mediaSource = new MediaSource();
    mediaSourceRef.current = mediaSource;
    
    console.log("Creating new MediaSource object");
    
    // Important: Set up event listener BEFORE assigning to video src
    mediaSource.addEventListener("sourceopen", function onSourceOpen() {
      console.log("MediaSource opened successfully!");
      
      try {
        // Set up source buffer when media source opens
        const mimeType = "video/webm;codecs=vp8,opus";
        if (MediaSource.isTypeSupported(mimeType)) {
          sourceBufferRef.current = mediaSource.addSourceBuffer(mimeType);
          console.log("SourceBuffer added successfully");
          
          // Set up updateend event
          sourceBufferRef.current.addEventListener("updateend", () => {
            isAppendingRef.current = false;
            processQueue();
          });
          
          // Now that everything is set up, start loading the stream
          setIsLoading(true);
          fetchManifestAndLoadChunks();
        } else {
          console.error("MIME type not supported");
          setError("This video format is not supported by your browser");
        }
      } catch (err) {
        console.error("Error setting up SourceBuffer:", err);
        setError("Failed to initialize video player");
      }
    }, { once: true });
    
    // Set the video source to the MediaSource
    if (videoRef.current) {
      videoRef.current.src = URL.createObjectURL(mediaSource);
    }
  }, 100);
  
  return () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = "";
    }
  };
}, [id]);

// Add this new function to handle manifest fetching and chunk loading
async function fetchManifestAndLoadChunks() {
  try {
    const streamUri = decodeURIComponent(id as string);
    setStreamUri(streamUri);
    
    const storageClient = initializeGroveClient();
    const manifestUrl = storageClient.resolve(streamUri);
    
    const response = await fetch(manifestUrl);
    if (!response.ok) throw new Error(`Failed to fetch manifest: ${response.status}`);
    
    const data = await response.json();
    setManifest(data);
    setSpace({
      id: streamUri,
      title: data.title || "Untitled Stream",
      creator: data.creator || "Unknown Creator",
      creatorAvatar: "/placeholder.svg?height=40&width=40",
      viewers: Math.floor(Math.random() * 50) + 5,
      isLive: data.status === "live",
    });
    
    // Load the first few chunks
    for (let i = 0; i < Math.min(3, data.chunks.length); i++) {
      const chunk = data.chunks[i];
      await fetchAndAppendChunk(chunk.uri);
      lastChunkIndexRef.current = chunk.index;
    }
    
    // Load remaining chunks and set up polling
    if (data.status === "live") {
      pollingRef.current = setInterval(pollManifestForNewChunks, 2000);
    }
  } catch (err) {
    console.error("Error loading stream:", err);
    setError(`Failed to load stream: ${err.message}`);
  } finally {
    setIsLoading(false);
  }
}

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
