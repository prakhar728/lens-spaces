/**
 * Lens Protocol Integration
 *
 * This file provides helper functions for interacting with Lens Protocol,
 * including post creation, fetching posts, fetching accounts, and social features
 * for livestreaming integration.
 */

import {
  uri,
  postId,
  evmAddress,
  PostReferenceType,
  Post,
  PostReactionType,
} from "@lens-protocol/client";
import {
  fetchPost,
  fetchPosts,
  fetchPostReferences,
  fetchPostsToExplore,
  post,
  fetchAccount,
  fetchPostReactions,
  addReaction,
  undoReaction,
} from "@lens-protocol/client/actions";
import { handleOperationWith } from "@lens-protocol/client/viem";
import { liveStream, textOnly } from "@lens-protocol/metadata";
import { ACLType, createACL, ChainId, uploadAsJson } from "./grove";
import { getLensClient } from "./client";
import { WalletClient } from "viem";

// Types
export interface PostCreateOptions {
  content: string;
  title?: string;
  attachments?: string[];
  commentOn?: string; // PostId to comment on
  isComment?: boolean;
}

export interface StreamPostOptions {
  title: string;
  streamUri: string;
  description?: string;
  tags?: string[];
  thumbnailUri?: string;
}

export interface PostResult {
  success: boolean;
  postId?: string;
  error?: string;
}

export interface LivestreamPost {
  id: string;
  title: string;
  description?: string;
  streamUri: string;
  ownerAddress: string;
  ownerUsername?: string;
  ownerAvatar?: string;
  createdAt: Date;
  tips: number;
  upvotes: number;
  commentCount: number;
}

/**
 * Creates a text-only post on Lens Protocol
 *
 * @param signer - The wallet signer
 * @param options - Post content options
 * @returns Post result with success status and postId if successful
 */
export async function createTextPost(
  walletClient: WalletClient,
  options: PostCreateOptions
): Promise<PostResult> {
  try {
    // Get authenticated session client
    const sessionClient = await getLensClient();

    if (!sessionClient.isSessionClient()) {
      return {
        success: false,
        error: "No authenticated session",
      };
    }

    // Create post metadata
    const metadata = textOnly({
      content: options.content,
      title: options.title,
      attachments: options.attachments
        ? options.attachments.map((uri) => ({ uri, type: "Image" }))
        : undefined,
    });

    // Upload metadata to Grove storage
    const acl = createACL(ACLType.IMMUTABLE, ChainId.MAINNET);
    const { uri: contentUri } = await uploadAsJson(metadata, { acl });

    // Prepare post parameters
    const postParams: any = {
      contentUri: uri(contentUri),
    };

    // Add comment reference if this is a comment
    if (options.commentOn) {
      postParams.commentOn = {
        post: postId(options.commentOn),
      };
    }

    // Create the post
    const result = await post(sessionClient, postParams).andThen(
      handleOperationWith(walletClient)
    );

    if (result.isErr()) {
      console.error("Error creating post:", result.error);
      return {
        success: false,
        error: result.error.message,
      };
    }

    // Get the transaction hash or post ID
    return {
      success: true,
      postId: result.value.id,
    };
  } catch (error) {
    console.error("Error in createTextPost:", error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Creates a livestream post on Lens Protocol
 *
 * @param walletClient - The wallet client
 * @param options - Stream post options
 * @returns Post result with success status and postId if successful
 */
export async function createStreamPost(
  walletClient: WalletClient,
  options: StreamPostOptions
): Promise<PostResult> {
  try {
    // Get authenticated session client
    const sessionClient = await getLensClient();
    if (!sessionClient.isSessionClient()) {
      return {
        success: false,
        error: "No authenticated session",
      };
    }
    // Create livestream metadata
    const metadata = liveStream({
      content:
        options.description || `Check out my livestream: ${options.title}`,
      title: options.title,
      liveUrl: options.streamUri,
      playbackUrl: options.streamUri,
      startsAt: new Date().toISOString().split(".")[0] + "Z",
    });
    // Upload metadata to Grove storage
    const acl = createACL(ACLType.IMMUTABLE, ChainId.MAINNET);
    const { uri: contentUri } = await uploadAsJson(metadata, { acl });

    // Create the livestream post with TippingPostAction
    const result = await post(sessionClient, {
      contentUri: uri(contentUri)
    }).andThen(handleOperationWith(walletClient));

    console.log(result);
    if (result.isErr()) {
      console.error("Error creating livestream post:", result.error);
      return {
        success: false,
        error: result.error.message,
      };
    }
    // Return success with post ID
    return {
      success: true,
      postId: result.value.id, // Make sure to access the ID correctly
    };
  } catch (error) {
    console.error("Error in createStreamPost:", error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Create a comment on a post
 *
 * @param walletClient - The wallet client
 * @param postIdToComment - ID of post to comment on
 * @param content - Comment content
 * @returns Post result with success status and commentId if successful
 */
export async function createComment(
  walletClient: WalletClient,
  postIdToComment: string,
  content: string
): Promise<PostResult> {
  try {
    // Get authenticated session client
    const sessionClient = await getLensClient();

    if (!sessionClient.isSessionClient()) {
      return {
        success: false,
        error: "No authenticated session",
      };
    }

    // Create comment metadata
    const metadata = textOnly({
      content: content,
    });

    // Upload metadata to Grove storage
    const acl = createACL(ACLType.IMMUTABLE, ChainId.MAINNET);
    const { uri: contentUri } = await uploadAsJson(metadata, { acl });

    // Create the comment
    const result = await post(sessionClient, {
      contentUri: uri(contentUri),
      commentOn: {
        post: postId(postIdToComment),
      },
    }).andThen(handleOperationWith(walletClient));

    if (result.isErr()) {
      console.error("Error creating comment:", result.error);
      return {
        success: false,
        error: result.error.message,
      };
    }

    // Return success with comment ID
    return {
      success: true,
      postId: result.value.id,
    };
  } catch (error) {
    console.error("Error in createComment:", error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Add a reaction (upvote or downvote) to a post
 *
 * @param walletClient - The wallet client
 * @param postIdToReact - ID of post to react to
 * @param reactionType - Type of reaction (Upvote or Downvote)
 * @returns Success status
 */
export async function reactToPost(
  postIdToReact: string,
  reactionType: PostReactionType = PostReactionType.Upvote
): Promise<{ success: boolean; error?: string }> {
  try {
    const sessionClient = await getLensClient();

    if (!sessionClient.isSessionClient()) {
      return {
        success: false,
        error: "No authenticated session",
      };
    }

    const result = await addReaction(sessionClient, {
      post: postId(postIdToReact),
      reaction: reactionType,
    });

    if (result.isErr()) {
      console.error("Error adding reaction:", result.error);
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: !!result.value,
    };
  } catch (error) {
    console.error("Error in reactToPost:", error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Remove a reaction (upvote or downvote) from a post
 *
 * @param walletClient - The wallet client
 * @param postIdToUnreact - ID of post to remove reaction from
 * @param reactionType - Type of reaction to remove (Upvote or Downvote)
 * @returns Success status
 */
export async function removeReaction(
  postIdToUnreact: string,
  reactionType: PostReactionType = PostReactionType.Upvote
): Promise<{ success: boolean; error?: string }> {
  try {
    const sessionClient = await getLensClient();

    if (!sessionClient.isSessionClient()) {
      return {
        success: false,
        error: "No authenticated session",
      };
    }

    const result = await undoReaction(sessionClient, {
      post: postId(postIdToUnreact),
      reaction: reactionType,
    });

    if (result.isErr()) {
      console.error("Error removing reaction:", result.error);
      return {
        success: false,
        error: result.error.message,
      };
    }

    return {
      success: !!result.value,
    };
  } catch (error) {
    console.error("Error in removeReaction:", error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Fetch reactions for a post
 *
 * @param postIdToFetch - ID of post to fetch reactions for
 * @param reactionType - Type of reactions to fetch (optional)
 * @param limit - Number of reactions to fetch (optional, default 20)
 * @returns Array of reactions with account info
 */
export async function getPostReactions(
  postIdToFetch: string,
  reactionType?: PostReactionType,
  limit: number = 20
): Promise<any> {
  try {
    const client = await getLensClient();

    const params: any = {
      post: postId(postIdToFetch),
      limit,
    };

    if (reactionType) {
      params.reaction = reactionType;
    }

    const result = await fetchPostReactions(client, params);

    if (result.isErr()) {
      console.error("Error fetching reactions:", result.error);
      throw new Error(result.error.message);
    }

    return {
      items: result.value.items,
      pageInfo: result.value.pageInfo,
    };
  } catch (error) {
    console.error("Error in getPostReactions:", error);
    throw error;
  }
}

/**
 * Fetch a single post by ID
 *
 * @param postIdToFetch - The ID of the post to fetch
 * @returns The post or an error
 */
export async function getPost(postIdToFetch: string): Promise<any> {
  try {
    const client = await getLensClient();

    const result = await fetchPost(client, {
      post: postId(postIdToFetch),
    });

    if (result.isErr()) {
      console.error("Error fetching post:", result.error);
      throw new Error(result.error.message);
    }

    return result.value;
  } catch (error) {
    console.error("Error in getPost:", error);
    throw error;
  }
}

/**
 * Fetch all comments for a post
 *
 * @param postIdToFetch - The ID of the post to fetch comments for
 * @param limit - Number of comments to fetch (optional, default 20)
 * @returns Comments for the post
 */
export async function getPostComments(
  postIdToFetch: string,
  limit: number = 20
): Promise<any> {
  try {
    const client = await getLensClient();

    const result = await fetchPostReferences(client, {
      referencedPost: postId(postIdToFetch),
      referenceTypes: [PostReferenceType.CommentOn],
    });

    if (result.isErr()) {
      console.error("Error fetching comments:", result.error);
      throw new Error(result.error.message);
    }

    console.log(result);

    return {
      items: result.value.items,
      pageInfo: result.value.pageInfo,
    };
  } catch (error) {
    console.error("Error in getPostComments:", error);
    throw error;
  }
}

/**
 * Fetch posts by a specific author (address)
 *
 * @param authorAddress - Author's EVM address
 * @param limit - Number of posts to fetch (optional, default 20)
 * @returns Posts by the author
 */
export async function getPostsByAuthor(
  authorAddress: string,
  limit: number = 20
): Promise<any> {
  try {
    const client = await getLensClient();

    const result = await fetchPosts(client, {
      filter: {
        authors: evmAddress(authorAddress),
      },
      limit,
    });

    if (result.isErr()) {
      console.error("Error fetching posts by author:", result.error);
      throw new Error(result.error.message);
    }

    return {
      items: result.value.items,
      pageInfo: result.value.pageInfo,
    };
  } catch (error) {
    console.error("Error in getPostsByAuthor:", error);
    throw error;
  }
}

/**
 * Fetch livestream posts from the network
 *
 * @param limit - Number of posts to fetch (optional, default 20)
 * @returns Livestream posts
 */
export async function getLivestreamPosts(): Promise<LivestreamPost[]> {
  try {
    const client = await getLensClient();

    console.log(process.env.NEXT_PUBLIC_APP_ADDRESS);

    // Fetch posts with livestream metadata
    const result = await fetchPosts(client, {
      filter: {
        apps: [evmAddress(process.env.NEXT_PUBLIC_APP_ADDRESS as string)],
      },
    });

    if (result.isErr()) {
      console.error("Error fetching livestream posts:", result.error);
      throw new Error(result.error.message);
    }
    console.log(result.value?.items);

    // console.log(
    //   result.value?.items.filter((post) => {
    //     // Filter for posts with livestream metadata
    //     return post.author.address === "0x90f6797C18dF84b5D0cFA110F57D4eCB4Afa37Ed" || post.author.owner === "0x90f6797C18dF84b5D0cFA110F57D4eCB4Afa37Ed" ;
    //   })
    // );

    // Filter and map posts to LivestreamPost format
    const livestreamPosts: LivestreamPost[] = result.value?.items
      .filter((post) => {
        // Filter for posts with livestream metadata
        return (
          post.__typename == "Post" &&
          post.metadata.__typename === "LivestreamMetadata"
        );
      })
      .map((post) => {
        const metadata = post.metadata; // LivestreamMetadata
        return {
          id: post.id,
          title: metadata.title || "Untitled Stream",
          description: metadata.content,
          streamUri: metadata.liveUrl || metadata.playbackUrl,
          ownerAddress: post.author.address,
          ownerUsername: post.author.username?.value,
          ownerAvatar:
            post.author.metadata?.picture?.__typename === "ImageSet"
              ? post.author.metadata.picture.optimized?.uri
              : undefined,
          createdAt: new Date(post.timestamp),
          upvotes: post.stats.upvotes,
          commentCount: post.stats.comments,
          tips: post.stats.tips,
        };
      });

    return livestreamPosts;
  } catch (error) {
    console.error("Error in getLivestreamPosts:", error);
    throw error;
  }
}

/**
 * Fetch account information by address
 *
 * @param address - EVM address of the account
 * @returns Account information
 */
export async function getAccountByAddress(address: string): Promise<any> {
  try {
    const client = await getLensClient();

    const result = await fetchAccount(client, {
      address: evmAddress(address),
    });

    if (result.isErr()) {
      console.error("Error fetching account:", result.error);
      throw new Error(result.error.message);
    }

    return result.value;
  } catch (error) {
    console.error("Error in getAccountByAddress:", error);
    throw error;
  }
}

/**
 * Fetch account information by username
 *
 * @param username - Lens username (e.g., "johndoe.lens")
 * @returns Account information
 */
export async function getAccountByUsername(username: string): Promise<any> {
  try {
    const client = await getLensClient();

    const result = await fetchAccount(client, {
      username,
    });

    if (result.isErr()) {
      console.error("Error fetching account by username:", result.error);
      throw new Error(result.error.message);
    }

    return result.value;
  } catch (error) {
    console.error("Error in getAccountByUsername:", error);
    throw error;
  }
}

/**
 * Check if the current user can comment on a post
 *
 * @param postIdToCheck - Post ID to check commenting permission
 * @returns Whether the user can comment and reason if not
 */
export async function canCommentOnPost(
  postIdToCheck: string
): Promise<{ canComment: boolean; reason?: string }> {
  try {
    const sessionClient = await getLensClient();

    if (!sessionClient.isSessionClient()) {
      return {
        canComment: false,
        reason: "No authenticated session",
      };
    }

    const result = await fetchPost(sessionClient, {
      post: postId(postIdToCheck),
    });

    if (result.isErr()) {
      console.error(
        "Error fetching post to check comment permission:",
        result.error
      );
      return {
        canComment: false,
        reason: result.error.message,
      };
    }

    const post = result.value;

    // Handle the different validation cases
    switch (post.operations?.canComment?.__typename) {
      case "PostOperationValidationPassed":
        return { canComment: true };

      case "PostOperationValidationFailed":
        return {
          canComment: false,
          reason: post.operations.canComment.reason,
        };

      case "PostOperationValidationUnknown":
        return {
          canComment: false,
          reason: "Unknown validation rules",
        };

      default:
        return {
          canComment: false,
          reason: "Unable to determine if commenting is allowed",
        };
    }
  } catch (error) {
    console.error("Error in canCommentOnPost:", error);
    return {
      canComment: false,
      reason: (error as Error).message,
    };
  }
}

/**
 * Formats livestream post data for display
 *
 * @param post - The raw post data from Lens API
 * @returns Formatted livestream post data
 */
export function formatLivestreamPost(post: any): LivestreamPost {
  const metadata =
    post.metadata.__typename === "LivestreamMetadata"
      ? post.metadata
      : { title: "Untitled Stream", content: "", liveUrl: "", playbackUrl: "" };

  return {
    id: post.id,
    title: metadata.title || "Untitled Stream",
    description: metadata.content,
    streamUri: metadata.liveUrl || metadata.playbackUrl,
    ownerAddress: post.author.address,
    ownerUsername: post.author.username?.value,
    ownerAvatar:
      post.author.metadata?.picture?.__typename === "ImageSet"
        ? post.author.metadata.picture.optimized?.uri
        : undefined,
    createdAt: new Date(post.timestamp),
    commentCount: post.stats.comments,
  };
}

export default {
  createTextPost,
  createStreamPost,
  createComment,
  getPost,
  getPostComments,
  getPostsByAuthor,
  getLivestreamPosts,
  getAccountByAddress,
  getAccountByUsername,
  canCommentOnPost,
  formatLivestreamPost,
  reactToPost,
  removeReaction,
  getPostReactions,
};
