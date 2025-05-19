"use client";
import type React from "react";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Loader2, Search, Users, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { getLivestreamPosts } from "@/lib/lens/lens";
import { useWalletClient } from "wagmi";

// LivestreamPost type based on your getLivestreamPosts function
interface LivestreamPost {
  id: string;
  title: string;
  description?: string;
  streamUri: string;
  ownerAddress: string;
  ownerUsername?: string;
  ownerAvatar?: string;
  createdAt: Date;
  commentCount: number;
  upvotes?: number;
  tips?: number;
  isLive?: boolean;
}

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allSpaces, setAllSpaces] = useState<LivestreamPost[]>([]);
  const [filteredSpaces, setFilteredSpaces] = useState<LivestreamPost[]>([]);
  const [trendingSpaces, setTrendingSpaces] = useState<LivestreamPost[]>([]);
  const [followingSpaces, setFollowingSpaces] = useState<LivestreamPost[]>([]);
  const { data: walletClient } = useWalletClient();
  const [activeTab, setActiveTab] = useState("all");

  // Fetch all livestream posts
  useEffect(() => {
    async function fetchLivestreams() {
      setLoading(true);
      setError(null);
      try {
        // Fetch livestream posts from Lens Protocol
        const livestreams = await getLivestreamPosts();

        // Keep only the data available from the API
        const processedStreams = livestreams.map((stream) => ({
          ...stream,
        }));

        setAllSpaces(processedStreams);
        setFilteredSpaces(processedStreams);

        // Sort by upvotes for trending (if available)
        const sortedStreams = [...processedStreams].sort(
          (a, b) => (b.upvotes || 0) - (a.upvotes || 0)
        );

        setTrendingSpaces(sortedStreams.slice(0, 6));
      } catch (err) {
        console.error("Error fetching livestreams:", err);
        setError("Failed to load streams. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchLivestreams();
  }, []);

  // Fetch following streams if wallet is connected
  useEffect(() => {
    async function fetchFollowingStreams() {
      if (!walletClient || allSpaces.length === 0) {
        setFollowingSpaces([]);
        return;
      }

      try {
        // For now, we'll use a subset of streams as an example
        // In production, this would be based on actual follow relationships
        setFollowingSpaces(allSpaces.slice(0, Math.min(4, allSpaces.length)));
      } catch (err) {
        console.error("Error fetching following streams:", err);
      }
    }

    if (activeTab === "following" && walletClient) {
      fetchFollowingStreams();
    }
  }, [walletClient, activeTab, allSpaces]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    if (!searchQuery.trim()) {
      setFilteredSpaces(allSpaces);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = allSpaces.filter(
      (space) =>
        space.title.toLowerCase().includes(query) ||
        space.ownerUsername?.toLowerCase().includes(query) ||
        space.ownerAddress.toLowerCase().includes(query) ||
        space.description?.toLowerCase().includes(query)
    );

    setFilteredSpaces(filtered);
  };

  // Function to render stream cards
  const renderStreamCard = (space: LivestreamPost) => (
    <Link href={`/space/${space.id}`} key={space.id}>
      <Card className="overflow-hidden shadow-soft hover:shadow-soft-lg transition-shadow card-hover">
        <div className="relative aspect-video bg-muted flex items-center justify-center">
          {space.ownerAvatar ? (
            <img
              src={space.ownerAvatar}
              alt={space.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-muted-foreground text-sm">No thumbnail</div>
          )}
        </div>
        <CardContent className="pt-4">
          <h3 className="font-semibold text-lg line-clamp-1">{space.title}</h3>
          <p className="text-muted-foreground text-sm">
            {space.ownerUsername ||
              `${space.ownerAddress.slice(0, 6)}...${space.ownerAddress.slice(
                -4
              )}`}
          </p>
          {space.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {space.description}
            </p>
          )}
        </CardContent>
        <CardFooter className="pt-0 flex justify-between text-sm text-muted-foreground">
          <div className="flex items-center">
            <MessageSquare className="h-4 w-4 mr-1" />
            <span>{space.commentCount || 0}</span>
          </div>
          {space.upvotes !== undefined && (
            <div className="flex items-center">
              <ThumbsUp className="h-4 w-4 mr-1" />
              <span>{space.upvotes}</span>
            </div>
          )}
          <div className="text-xs">
            {new Date(space.createdAt).toLocaleDateString()}
          </div>
        </CardFooter>
      </Card>
    </Link>
  );

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
        <Tabs
          defaultValue="all"
          className="mb-8"
          onValueChange={(value) => setActiveTab(value)}
        >
          <TabsList className="grid w-full md:w-auto grid-cols-3 md:inline-flex">
            <TabsTrigger value="all">All Spaces</TabsTrigger>
            <TabsTrigger value="trending">Trending</TabsTrigger>
            <TabsTrigger value="following">Following</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-6">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-center py-20 text-muted-foreground">
                <p>{error}</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </Button>
              </div>
            ) : filteredSpaces.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <p>
                  No livestreams found
                  {searchQuery ? ` matching "${searchQuery}"` : ""}.
                </p>
                {searchQuery && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setSearchQuery("");
                      setFilteredSpaces(allSpaces);
                    }}
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSpaces.map(renderStreamCard)}
              </div>
            )}
          </TabsContent>
          <TabsContent value="trending" className="mt-6">
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : trendingSpaces.length === 0 ? (
              <div className="flex items-center justify-center h-40 bg-muted/30 rounded-lg">
                <p className="text-muted-foreground">
                  No trending spaces available
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {trendingSpaces.map(renderStreamCard)}
              </div>
            )}
          </TabsContent>
          <TabsContent value="following" className="mt-6">
            {!walletClient ? (
              <div className="flex flex-col items-center justify-center h-40 bg-muted/30 rounded-lg">
                <p className="text-muted-foreground mb-2">
                  Connect your wallet to see spaces from creators you follow
                </p>
                <Button variant="outline" className="rounded-full shadow-soft">
                  <Users className="mr-2 h-4 w-4" /> Connect Wallet
                </Button>
              </div>
            ) : loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : followingSpaces.length === 0 ? (
              <div className="flex items-center justify-center h-40 bg-muted/30 rounded-lg">
                <p className="text-muted-foreground">
                  You're not following any creators with active streams
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {followingSpaces.map(renderStreamCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
