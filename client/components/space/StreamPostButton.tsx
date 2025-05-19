/**
 * StreamPostButton Component
 * 
 * This component provides a button to create a Lens post for a livestream
 * along with status indicators for the post creation process.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PenSquare, Check, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { createStreamPost } from "@/lib/lens/lens";
import { useWalletClient } from "wagmi";

interface StreamPostButtonProps {
  streamUri: string | null;
  title: string;
  disabled?: boolean;
  onPostCreated?: (postId: string) => void;
}

export function StreamPostButton({ 
  streamUri, 
  title,
  disabled = false,
  onPostCreated
}: StreamPostButtonProps) {
  const { toast } = useToast();
  const { data: walletClient } = useWalletClient();
  const [isCreating, setIsCreating] = useState(false);
  const [postCreated, setPostCreated] = useState(false);
  const [postId, setPostId] = useState<string | null>(null);

  const handleCreatePost = async () => {
    if (!streamUri || !walletClient || isCreating || postCreated) return;

    setIsCreating(true);
    
    try {
      const description = `Hey! I'm live streaming "${title}". Come join and chat with me!`;
      
      const result = await createStreamPost(walletClient, {
        title,
        streamUri,
        description
      });

      console.log(result);
      

      if (result.success && result.postId) {
        setPostCreated(true);
        setPostId(result.postId);
        
        toast({
          title: "Post Created",
          description: "Your stream has been posted to Lens Protocol!",
        });
        
        if (onPostCreated) {
          onPostCreated(result.postId);
        }
      } else {
        toast({
          title: "Post Creation Failed",
          description: result.error || "An unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating stream post:", error);
      toast({
        title: "Post Creation Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Button
      onClick={handleCreatePost}
      disabled={disabled || !streamUri || isCreating || postCreated || !walletClient}
      variant={postCreated ? "outline" : "default"}
      className="rounded-full shadow-soft"
    >
      {isCreating ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Creating Post...
        </>
      ) : postCreated ? (
        <>
          <Check className="mr-2 h-4 w-4 text-green-500" />
          Posted to Lens
        </>
      ) : (
        <>
          <PenSquare className="mr-2 h-4 w-4" />
          Share on Lens
        </>
      )}
    </Button>
  );
}