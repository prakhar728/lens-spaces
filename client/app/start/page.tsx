/**
 * Updated StartSpace component with Lens post creation and chat integration
 */

"use client";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Share, StopCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { StreamRecorder } from "@/lib/lens/stream";
import { fetchAccount } from "@lens-protocol/client/actions";
import { getLensClient } from "@/lib/lens/client";
import { useWalletClient } from "wagmi";
import { signer } from "@/lib/lens/signer";
import { StreamPostButton } from "@/components/space/StreamPostButton";
import LensChat from "@/components/space/Chat";

export default function StartSpace() {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(0);
  const [streamStartTime, setstreamStartTime] = useState(0);
  const [account, setAccount] = useState<any>(null);
  const [streamUri, setStreamUri] = useState<string | null>(null);
  const { data: walletClient } = useWalletClient();
  const [isDownloadMode, setIsDownloadMode] = useState(false);
  const [postId, setPostId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);

  // Video preview reference
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Stream recorder reference
  const recorderRef = useRef<StreamRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lensClientRef = useRef<any>(null);

  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Get authenticated account on component mount
  useEffect(() => {
    async function getAuthenticatedAccount() {
      const client = await getLensClient();
      if (!client.isSessionClient()) return;

      const user = client.getAuthenticatedUser().unwrapOr(null);
      if (!user) return;

      const account = fetchAccount(client, {
        address: user.address,
      }).unwrapOr(null);

      // Set account data
      setAccount(await account);

      // Store Lens client for signing
      lensClientRef.current = signer;
    }

    if (walletClient) getAuthenticatedAccount();
  }, [walletClient]);

  // Start streaming process
  const startStream = async () => {
    if (!title) return;
    if (!account) {
      toast({
        title: "Not Connected",
        description: "Please connect your Lens account first",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsStreaming(true);
      setUploadStatus(0);
      setstreamStartTime(Date.now());

      // Request user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      // Set video preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true; // Mute preview to prevent feedback
        videoRef.current.play();
      }

      // Store stream reference
      streamRef.current = stream;

      console.log(account);

      // Create stream recorder
      recorderRef.current = new StreamRecorder(
        signer.address,
        account?.address,
        lensClientRef.current, // Lens client for signing
        { chunkDuration: 30000 } // Create a new chunk every 3 seconds
      );

      recorderRef.current.setDownloadMode(isDownloadMode);

      recorderRef.current.onChunkDownloaded((index, blob) => {
        // Create a download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `chunk-${index}-${Date.now()}.webm`;

        // Trigger download
        document.body.appendChild(a);
        a.click();

        // Clean up
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);

        // Update progress
        const progress = Math.min(95, Math.floor((index / (index + 5)) * 100));
        setUploadStatus(progress);
      });

      // Set up chunk upload callback to update progress
      recorderRef.current.onChunkUploaded((index, total) => {
        // Calculate upload progress (max 95%, reserve 5% for finalizing)
        const progress = Math.min(95, Math.floor((index / (total + 5)) * 100));
        setUploadStatus(progress);

        toast({
          title: "Chunk Uploaded",
          description: `Chunk #${index + 1} uploaded to Grove.`,
        });
      });

      // Set up error callback
      recorderRef.current.onError((error) => {
        toast({
          title: "Streaming Error",
          description: error.message,
          variant: "destructive",
        });
      });


      // Initialize the stream
      const uri = await recorderRef.current.initializeStream(
        title,
        account.address
      );

      // Store stream URI
      setStreamUri(uri);

      await sleep(3000);
      // Start recording
      await recorderRef.current.startRecording(stream);

      toast({
        title: "Stream Started",
        description: "Your live space is now active",
      });
    } catch (error) {
      console.error("Error starting stream:", error);
      toast({
        title: "Failed to Start Stream",
        description: (error as Error).message,
        variant: "destructive",
      });
      setIsStreaming(false);
    }
  };

  // End streaming
  const endStream = async () => {
    try {
      // Stop recording and finalize the stream
      if (recorderRef.current) {
        await recorderRef.current.stopRecording();
      }

      // Stop media tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      // Clear video preview
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      // Set full progress
      setUploadStatus(100);

      toast({
        title: "Stream Ended",
        description:
          "Your stream has been saved and is now available for playback",
      });
    } catch (error) {
      console.error("Error ending stream:", error);
      toast({
        title: "Error Ending Stream",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      // Reset state after a brief delay to show 100% completion
      setTimeout(() => {
        setIsStreaming(false);
        setUploadStatus(0);
      }, 1500);
    }
  };

  // Share stream
  const shareStream = () => {
    if (!streamUri) return;

    // Create shareable URL
    const shareUrl = `${window.location.origin}/space/${encodeURIComponent(
      streamUri
    )}`;

    // Copy to clipboard
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast({
        title: "Link Copied",
        description: "Stream link copied to clipboard",
      });
    });
  };

  // Handle post creation success
  const handlePostCreated = (newPostId: string) => {
    console.log(newPostId);
    
    setPostId(newPostId);
    setShowChat(true);

    toast({
      title: "Chat Enabled",
      description:
        "Your stream now has a chat section powered by Lens comments!",
    });
  };

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
                  e.preventDefault();
                  startStream();
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
                <Button
                  type="submit"
                  size="lg"
                  className="w-full rounded-full shadow-soft"
                  disabled={!title || !account}
                >
                  {!account ? "Connect Lens Account First" : "Start Stream"}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card className="shadow-soft overflow-hidden">
                <div className="aspect-video bg-black flex items-center justify-center text-white relative">
                  {/* Actual video preview */}
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                  />
                  <div className="absolute top-4 left-4">
                    <div className="flex items-center gap-2 bg-black/50 px-3 py-1 rounded-full">
                      <div className="animate-pulse text-red-500">●</div>
                      <span className="text-sm font-medium">LIVE</span>
                    </div>
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
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadStatus}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                      variant="destructive"
                      className="flex-1 rounded-full shadow-soft"
                      onClick={endStream}
                    >
                      <StopCircle className="mr-2 h-4 w-4" /> End Stream
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 rounded-full shadow-soft"
                      onClick={shareStream}
                      disabled={!streamUri}
                    >
                      <Share className="mr-2 h-4 w-4" /> Share
                    </Button>

                    {/* Stream Post Button */}
                    <StreamPostButton
                      streamUri={streamUri}
                      title={title}
                      disabled={!streamUri || (Date.now() - streamStartTime) / 1000  < 30} // Only enable 30 seconds after streaming starts
                      onPostCreated={handlePostCreated}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="text-center text-sm text-muted-foreground">
                <p>
                  Your stream is being stored on decentralized storage via
                  Grove.
                </p>
                <p>
                  This ensures your content remains censorship-resistant and
                  truly yours.
                </p>

                <Button
                  variant="outline"
                  onClick={() => setIsDownloadMode(!isDownloadMode)}
                  className="mt-4 mb-4"
                >
                  {isDownloadMode
                    ? "Switch to Grove Upload"
                    : "Switch to Local Download"}
                </Button>

                {streamUri && (
                  <div className="mt-4 flex flex-col items-center">
                    <p className="mb-2 font-medium">Direct Link:</p>
                    <div className="flex items-center gap-2 max-w-full overflow-hidden">
                      <Button
                        variant="link"
                        className="text-primary font-medium truncate max-w-md"
                        onClick={() => {
                          const shareUrl = `${
                            window.location.origin
                          }/space/${encodeURIComponent(streamUri)}`;
                          window.open(shareUrl, "_blank");
                        }}
                      >
                        {`${window.location.origin}/space/${encodeURIComponent(
                          streamUri
                        )}`}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="px-2 rounded-full flex-shrink-0"
                        onClick={() => {
                          const shareUrl = `${
                            window.location.origin
                          }/space/${encodeURIComponent(streamUri)}`;
                          navigator.clipboard.writeText(shareUrl).then(() => {
                            toast({
                              title: "Link Copied",
                              description:
                                "Direct stream link copied to clipboard",
                            });
                          });
                        }}
                      >
                        <Share className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Chat Section - Only show when a post has been created */}
            {showChat && postId && (
              <div className="lg:col-span-1">
                <LensChat
                  postId={postId}
                  isLive={true}
                  viewerCount={Math.floor(Math.random() * 10) + 1} // Simulated viewer count
                  height="h-[600px]"
                  streamOwner={account?.address}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
