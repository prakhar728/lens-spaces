/**
 * LensChat Component
 * 
 * A reusable chat component that integrates with Lens Protocol comments.
 * Can be used in both live streaming and recorded content views.
 */

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { createComment, getPostComments, canCommentOnPost } from "@/lib/lens/lens";
import { useWalletClient } from "wagmi";

// Types for comment data
export interface ChatMessage {
  id: string;
  sender: {
    address: string;
    username?: string;
    avatar?: string;
  };
  message: string;
  timestamp: number;
}

interface LensChatProps {
  postId?: string;
  isLive?: boolean;
  viewerCount?: number;
  className?: string;
  height?: string;
  streamOwner?: string;
  onCommentCreated?: (commentId: string) => void;
}

export default function LensChat({
  postId,
  isLive = false,
  viewerCount = 0,
  className = "",
  height = "h-[calc(100vh-200px)]",
  streamOwner,
  onCommentCreated
}: LensChatProps) {
  const { toast } = useToast();
  const { data: walletClient } = useWalletClient();
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canComment, setCanComment] = useState(true);
  const [commentReason, setCommentReason] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timer | null>(null);

  // Check if user is authenticated and can comment
  useEffect(() => {
    const checkAuth = async () => {
      if (walletClient) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, [walletClient]);

  // Check if user can comment on the post
  useEffect(() => {
    const checkCommentPermission = async () => {
      if (!postId || !walletClient) return;
      
      try {
        const result = await canCommentOnPost(postId);
        setCanComment(result.canComment);
        setCommentReason(result.reason || null);
      } catch (err) {
        console.error("Error checking comment permission:", err);
        // Default to allowed if we can't check
        setCanComment(true);
      }
    };

    checkCommentPermission();
  }, [postId, walletClient]);

  // Load initial comments and set up polling
  useEffect(() => {
    if (!postId) return;

    const fetchComments = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await getPostComments(postId);
        
        // Convert comments to ChatMessage format
        const messages: ChatMessage[] = result.items.map((comment: any) => ({
          id: comment.id,
          sender: {
            address: comment.author.address,
            username: comment.author.username?.value || comment.author.address.slice(0, 6),
            avatar: comment.author.metadata?.picture?.__typename === 'ImageSet' 
              ? comment.author.metadata.picture.optimized?.uri 
              : undefined,
          },
          message: comment.metadata.__typename === 'TextOnlyMetadata' 
            ? comment.metadata.content 
            : 'Message',
          timestamp: new Date(comment.timestamp).getTime()
        })).sort((a: ChatMessage, b: ChatMessage) => a.timestamp - b.timestamp);
        
        setChatMessages(messages);
      } catch (err) {
        console.error("Error fetching comments:", err);
        setError("Failed to load comments. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchComments();

    // Set up polling for new comments if live
    if (isLive) {
      pollingIntervalRef.current = setInterval(fetchComments, 15000); // Poll every 15 seconds
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [postId, isLive]);

  // Auto-scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message || !postId || !walletClient || isSending) return;
    
    setIsSending(true);
    
    try {
      const result = await createComment(walletClient, postId, message);
      
      if (result.success) {
        // Add message to chat immediately (optimistic UI update)
        const newMessage: ChatMessage = {
          id: result.postId || Date.now().toString(),
          sender: {
            address: walletClient.account.address,
            username: 'you',
          },
          message,
          timestamp: Date.now(),
        };
        
        setChatMessages((prev) => [...prev, newMessage]);
        setMessage("");
        
        if (onCommentCreated && result.postId) {
          onCommentCreated(result.postId);
        }
      } else {
        toast({
          title: "Failed to Send",
          description: result.error || "Your message couldn't be sent",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error sending comment:", error);
      toast({
        title: "Failed to Send",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  // Render chat UI
  return (
    <Card className={`shadow-soft ${height} flex flex-col ${className}`}>
      <CardContent className="pt-6 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">
            {isLive ? "Live Chat" : "Comments"}
          </h2>
          {isLive && (
            <Badge variant="outline" className="px-2 py-1 text-xs">
              {viewerCount} online
            </Badge>
          )}
        </div>

        {/* Chat messages container */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto mb-4 space-y-4"
        >
          {isLoading ? (
            <div className="flex justify-center items-center h-24">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center text-muted-foreground p-4">
              {error}
              <Button 
                variant="link" 
                className="block mx-auto mt-2"
                onClick={() => setChatMessages([])}
              >
                Try Again
              </Button>
            </div>
          ) : chatMessages.length === 0 ? (
            <div className="text-center text-muted-foreground p-4">
              No comments yet. Be the first to comment!
            </div>
          ) : (
            chatMessages.map((msg) => (
              <div key={msg.id} className="flex items-start gap-2">
                <Avatar className="h-8 w-8">
                  {msg.sender.avatar ? (
                    <AvatarImage src={msg.sender.avatar} alt={msg.sender.username || "user"} />
                  ) : (
                    <AvatarFallback>
                      {msg.sender.username?.[0].toUpperCase() || "U"}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <span className="text-sm font-medium">
                    {msg.sender.username || msg.sender.address.slice(0, 6)}
                    {streamOwner && msg.sender.address === streamOwner && (
                      <Badge variant="secondary" className="ml-2 px-1 py-0 text-xs">
                        Creator
                      </Badge>
                    )}
                  </span>
                  <p className="text-sm">{msg.message}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Chat input */}
        <form onSubmit={handleSendMessage} className="mt-auto">
          <div className="flex gap-2">
            <Input
              placeholder={
                !isAuthenticated 
                  ? "Connect wallet to chat..." 
                  : !canComment 
                  ? commentReason || "You cannot comment on this post" 
                  : "Type a message..."
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="rounded-full shadow-soft"
              disabled={!isAuthenticated || !canComment || isSending || !postId}
            />
            <Button
              type="submit"
              size="icon"
              className="rounded-full shadow-soft"
              disabled={!message || !isAuthenticated || !canComment || isSending || !postId}
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}