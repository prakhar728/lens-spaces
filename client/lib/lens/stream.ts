/**
 * LensSpaces - Streaming Service
 * 
 * A specialized service for handling decentralized live streaming using Grove storage.
 * This library builds on top of the basic grove.ts and adds streaming-specific functionality.
 */

import {
  ChainId,
  ACLType,
  createACL,
  uploadFile,
  uploadAsJson,
  updateJson,
  resolveUri,
  Signer
} from '@/lib/lens/grove';

// Types
export interface StreamChunk {
  uri: string;
  timestamp: number;
  index: number;
}

export interface StreamManifest {
  version: string;
  title: string;
  creator: string;
  startedAt: number;
  endedAt: number | null;
  chunkCount: number;
  chunks: StreamChunk[];
  status: "live" | "ended";
}

export interface StreamRecorderOptions {
  chunkDuration: number; // Duration in ms for each chunk
  mimeType?: string; // Preferred mime type (falls back to browser supported types)
}

export interface StreamPlayerOptions {
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  pollingInterval?: number; // How often to check for new chunks (ms)
}

/**
 * Creates a new stream manifest
 */
export function createStreamManifest(title: string, creator: string): StreamManifest {
  return {
    version: "1.0",
    title,
    creator,
    startedAt: Date.now(),
    endedAt: null,
    chunkCount: 0,
    chunks: [],
    status: "live"
  };
}

/**
 * Initializes a new stream by uploading the initial manifest
 */
export async function initializeStream(
  manifest: StreamManifest,
  userAddress: string
): Promise<string> {
  try {
    // Create mutable ACL for the streamer (only they can update)
    const updateACL = createACL(
      ACLType.WALLET_ADDRESS, 
      ChainId.TESTNET,
      userAddress
    );
    
    console.log(updateACL);
    
    // Upload initial manifest to Grove
    const response = await uploadAsJson(manifest, { acl: updateACL });
    console.log(response);
    
    return response.uri;
  } catch (error) {
    console.error("Error initializing stream:", error);
    throw new Error("Failed to initialize stream");
  }
}

/**
 * Uploads a media chunk to Grove
 */
export async function uploadStreamChunk(chunk: Blob, index: number): Promise<string> {
  try {
    // Create immutable ACL for chunks (anyone can view)
    const viewACL = createACL(ACLType.IMMUTABLE, ChainId.TESTNET);
    
    // Create a file from the chunk
    const file = new File(
      [chunk], 
      `chunk-${index}-${Date.now()}.webm`, 
      { type: "video/webm" }
    );
    
    // Upload file to Grove
    const response = await uploadFile(file, { acl: viewACL });
    return response.uri;
  } catch (error) {
    console.error("Error uploading chunk:", error);
    throw new Error("Failed to upload stream chunk");
  }
}

/**
 * Updates the stream manifest with a new chunk
 */
export async function updateStreamManifest(
  streamUri: string,
  manifest: StreamManifest,
  chunkUri: string,
  index: number,
  userAddress: string,
  signer: Signer
): Promise<StreamManifest> {
  try {
    // Create updated manifest with new chunk
    const updatedManifest: StreamManifest = {
      ...manifest,
      chunkCount: manifest.chunkCount + 1,
      chunks: [
        ...manifest.chunks,
        {
          uri: chunkUri,
          timestamp: Date.now(),
          index
        }
      ]
    };
    
    // Create ACL for updating
    const updateACL = createACL(
      ACLType.WALLET_ADDRESS, 
      ChainId.TESTNET,
      userAddress
    );
    
    // Update manifest in Grove
    await updateJson(
      streamUri,
      updatedManifest,
      signer,
      { acl: updateACL }
    );
    
    return updatedManifest;
  } catch (error) {
    console.error("Error updating stream manifest:", error);
    throw new Error("Failed to update stream manifest");
  }
}

/**
 * Ends a stream by updating its status
 */
export async function endStream(
  streamUri: string,
  manifest: StreamManifest,
  userAddress: string,
  signer: Signer
): Promise<StreamManifest> {
  try {
    // Create finalized manifest
    const finalizedManifest: StreamManifest = {
      ...manifest,
      endedAt: Date.now(),
      status: "ended"
    };
    
    // Create ACL for updating
    const updateACL = createACL(
      ACLType.WALLET_ADDRESS, 
      ChainId.TESTNET,
      userAddress
    );
    
    // Update manifest in Grove
    await updateJson(
      streamUri,
      finalizedManifest,
      signer,
      { acl: updateACL }
    );
    
    return finalizedManifest;
  } catch (error) {
    console.error("Error ending stream:", error);
    throw new Error("Failed to end stream");
  }
}

/**
 * Loads a stream manifest from Grove
 */
export async function loadStreamManifest(streamUri: string): Promise<StreamManifest> {
  try {
    // Resolve Grove URI to get URL
    const manifestUrl = resolveUri(streamUri);
    
    // Fetch manifest
    const response = await fetch(manifestUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch stream manifest: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error loading stream manifest:", error);
    throw new Error("Failed to load stream");
  }
}

/**
 * Class to manage stream recording and uploading
 */
export class StreamRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private chunkCounter: number = 0;
  private streamUri: string | null = null;
  private manifest: StreamManifest | null = null;
  private userAddress: string;
  private signer: Signer;
  private options: StreamRecorderOptions;
  private isRecording: boolean = false;
  private uploadQueue: Blob[] = [];
  private isUploading: boolean = false;
  
  // Events
  private onChunkUploadedCallback: ((index: number, total: number) => void) | null = null;
  private onErrorCallback: ((error: Error) => void) | null = null;
  
  constructor(
    userAddress: string,
    signer: Signer,
    options: StreamRecorderOptions = { chunkDuration: 3000 }
  ) {  
    this.userAddress = userAddress;
    this.signer = signer;
    this.options = options;
  }
  
  public onChunkUploaded(callback: (index: number, total: number) => void): void {
    this.onChunkUploadedCallback = callback;
  }
  
  public onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }
  
  public async initializeStream(title: string, creator: string): Promise<string> {
    try {
      // Create initial manifest
      this.manifest = createStreamManifest(title, creator);
      
      // Upload manifest
      this.streamUri = await initializeStream(this.manifest, this.userAddress);
      
      return this.streamUri;
    } catch (error) {
      console.error("Error initializing stream:", error);
      this.handleError(new Error("Failed to initialize stream"));
      throw error;
    }
  }
  
  public async startRecording(mediaStream: MediaStream): Promise<void> {
    if (this.isRecording) {
      return;
    }
    
    if (!this.streamUri || !this.manifest) {
      throw new Error("Stream not initialized. Call initializeStream first");
    }
    
    this.stream = mediaStream;
    this.isRecording = true;
    
    try {
      // Determine mime type
      const mimeTypes = [
        this.options.mimeType, // Try user-provided mime type first
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm'
      ].filter(Boolean) as string[];
      
      let selectedMimeType = null;
      
      // Find the first supported mime type
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }
      
      if (!selectedMimeType) {
        throw new Error("No supported mime types found for recording");
      }
      
      // Create media recorder
      this.mediaRecorder = new MediaRecorder(mediaStream, { 
        mimeType: selectedMimeType 
      });
      
      // Handle data available
      this.mediaRecorder.ondataavailable = this.handleDataAvailable.bind(this);
      
      // Handle errors
      this.mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        this.handleError(new Error("MediaRecorder error"));
      };
      
      // Start recording with specified chunk interval
      this.mediaRecorder.start(this.options.chunkDuration);
      
      console.log("Recording started with mime type:", selectedMimeType);
    } catch (error) {
      console.error("Error starting recording:", error);
      this.isRecording = false;
      this.handleError(new Error("Failed to start recording"));
      throw error;
    }
  }
  
  public async stopRecording(): Promise<void> {
    if (!this.isRecording) {
      return;
    }
    
    try {
      // Stop media recorder
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
      
      // Stop media tracks
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
      }
      
      // Wait for any pending uploads to complete
      await this.waitForUploads();
      
      // Finalize stream if initialized
      if (this.streamUri && this.manifest) {
        // Update manifest to indicate stream has ended
        this.manifest = await endStream(
          this.streamUri,
          this.manifest,
          this.userAddress,
          this.signer
        );
      }
      
      this.isRecording = false;
      console.log("Recording stopped and stream finalized");
    } catch (error) {
      console.error("Error stopping recording:", error);
      this.handleError(new Error("Failed to stop recording"));
      throw error;
    }
  }
  
  private handleDataAvailable(event: BlobEvent): void {
    if (event.data && event.data.size > 0) {
      // Add to chunks
      this.chunks.push(event.data);
      
      // Queue for upload
      this.uploadQueue.push(event.data);
      
      // Start upload process if not already running
      if (!this.isUploading) {
        this.processUploadQueue();
      }
    }
  }
  
  private async processUploadQueue(): Promise<void> {
    if (this.isUploading || this.uploadQueue.length === 0) {
      return;
    }
    
    this.isUploading = true;
    
    try {
      // Get next chunk from queue
      const chunk = this.uploadQueue.shift();
      
      if (!chunk) {
        this.isUploading = false;
        return;
      }
      
      // Upload chunk
      const chunkIndex = this.chunkCounter++;
      const chunkUri = await uploadStreamChunk(chunk, chunkIndex);
      
      // Update manifest
      if (this.streamUri && this.manifest) {
        this.manifest = await updateStreamManifest(
          this.streamUri,
          this.manifest,
          chunkUri,
          chunkIndex,
          this.userAddress,
          this.signer
        );
        
        // Trigger callback
        if (this.onChunkUploadedCallback) {
          this.onChunkUploadedCallback(chunkIndex, this.chunks.length);
        }
      }
    } catch (error) {
      console.error("Error processing upload queue:", error);
      // Continue processing queue even on error
    } finally {
      this.isUploading = false;
      
      // Process next item if queue is not empty
      if (this.uploadQueue.length > 0) {
        this.processUploadQueue();
      }
    }
  }
  
  private async waitForUploads(): Promise<void> {
    // Wait for all uploads to complete
    return new Promise<void>((resolve) => {
      const checkUploads = () => {
        if (this.uploadQueue.length === 0 && !this.isUploading) {
          resolve();
        } else {
          setTimeout(checkUploads, 100);
        }
      };
      
      checkUploads();
    });
  }
  
  private handleError(error: Error): void {
    if (this.onErrorCallback) {
      this.onErrorCallback(error);
    }
  }
}

/**
 * Class to manage stream playback
 */
export class StreamPlayer {
  private videoElement: HTMLVideoElement;
  private streamUri: string;
  private options: StreamPlayerOptions;
  private mediaSource: MediaSource | null = null;
  private sourceBuffer: SourceBuffer | null = null;
  private manifest: StreamManifest | null = null;
  private isPlaying: boolean = false;
  private pollingInterval: number | null = null;
  private lastProcessedChunkIndex: number = -1;
  private pendingChunks: ArrayBuffer[] = [];
  private isBufferUpdating: boolean = false;
  
  // Events
  private onManifestLoadedCallback: ((manifest: StreamManifest) => void) | null = null;
  private onStreamEndedCallback: (() => void) | null = null;
  private onErrorCallback: ((error: Error) => void) | null = null;
  
  constructor(
    videoElement: HTMLVideoElement,
    streamUri: string,
    options: StreamPlayerOptions = { 
      autoPlay: true, 
      muted: true, 
      controls: true,
      pollingInterval: 2000
    }
  ) {
    this.videoElement = videoElement;
    this.streamUri = streamUri;
    this.options = options;
    
    // Set video element properties
    this.videoElement.muted = options.muted ?? true;
    this.videoElement.controls = options.controls ?? true;
  }
  
  public onManifestLoaded(callback: (manifest: StreamManifest) => void): void {
    this.onManifestLoadedCallback = callback;
  }
  
  public onStreamEnded(callback: () => void): void {
    this.onStreamEndedCallback = callback;
  }
  
  public onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }
  
  public async initialize(): Promise<void> {
    try {
      // Load initial manifest
      this.manifest = await loadStreamManifest(this.streamUri);
      
      // Trigger callback
      if (this.onManifestLoadedCallback) {
        this.onManifestLoadedCallback(this.manifest);
      }
      
      // Setup media source
      await this.setupMediaSource();
      
      // Start polling for manifest updates
      this.startPolling();
      
      // Load initial chunks
      await this.loadInitialChunks();
    } catch (error) {
      console.error("Error initializing player:", error);
      this.handleError(new Error("Failed to initialize player"));
      throw error;
    }
  }
  
  public stop(): void {
    // Stop polling
    this.stopPolling();
    
    // Pause video
    if (this.videoElement) {
      this.videoElement.pause();
    }
    
    // Close media source
    if (this.mediaSource && this.mediaSource.readyState === 'open') {
      try {
        this.mediaSource.endOfStream();
      } catch (error) {
        console.error("Error ending media source stream:", error);
      }
    }
    
    this.isPlaying = false;
  }
  
  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
  
  private async setupMediaSource(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        // Create new MediaSource
        this.mediaSource = new MediaSource();
        
        // Set video source to MediaSource URL
        this.videoElement.src = URL.createObjectURL(this.mediaSource);
        
        // Setup source buffer when MediaSource opens
        this.mediaSource.addEventListener('sourceopen', () => {
          try {
            // Find supported codec
            const mimeTypes = [
              'video/webm;codecs=vp9,opus',
              'video/webm;codecs=vp8,opus',
              'video/webm'
            ];
            
            let supportedMimeType: string | null = null;
            
            for (const mimeType of mimeTypes) {
              if (MediaSource.isTypeSupported(mimeType)) {
                supportedMimeType = mimeType;
                break;
              }
            }
            
            if (!supportedMimeType) {
              throw new Error("No supported codec found for stream playback");
            }
            
            // Create source buffer with supported codec
            this.sourceBuffer = this.mediaSource!.addSourceBuffer(supportedMimeType);
            
            // Handle buffer updates
            this.sourceBuffer.addEventListener('updateend', () => {
              this.isBufferUpdating = false;
              this.processNextPendingChunk();
            });
            
            this.isPlaying = true;
            resolve();
          } catch (error) {
            console.error("Error setting up source buffer:", error);
            reject(error);
          }
        });
      } catch (error) {
        console.error("Error setting up MediaSource:", error);
        reject(error);
      }
    });
  }
  
  private startPolling(): void {
    // Clear existing interval if any
    this.stopPolling();
    
    // Poll for manifest updates at specified interval
    this.pollingInterval = window.setInterval(async () => {
      try {
        // Load latest manifest
        const latestManifest = await loadStreamManifest(this.streamUri);
        
        // Update manifest if there are changes
        if (latestManifest.chunkCount > (this.manifest?.chunkCount || 0)) {
          this.manifest = latestManifest;
          
          // Load any new chunks
          await this.loadNewChunks();
        }
        
        // If stream has ended, stop polling
        if (latestManifest.status === "ended") {
          this.stopPolling();
          
          // Trigger callback
          if (this.onStreamEndedCallback) {
            this.onStreamEndedCallback();
          }
          
          // End the stream
          if (this.mediaSource && this.mediaSource.readyState === 'open') {
            try {
              this.mediaSource.endOfStream();
            } catch (error) {
              console.error("Error ending media source stream:", error);
            }
          }
        }
      } catch (error) {
        console.error("Error polling manifest:", error);
      }
    }, this.options.pollingInterval || 2000);
  }
  
  private stopPolling(): void {
    if (this.pollingInterval !== null) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
  
  private async loadInitialChunks(): Promise<void> {
    if (!this.manifest || this.manifest.chunks.length === 0) {
      return;
    }
    
    // Load first few chunks (e.g., the first 2 chunks)
    const initialChunksToLoad = Math.min(2, this.manifest.chunks.length);
    
    for (let i = 0; i < initialChunksToLoad; i++) {
      await this.loadChunk(this.manifest.chunks[i]);
    }
    
    // Start video playback if autoPlay is enabled
    if (this.options.autoPlay && this.videoElement.paused) {
      try {
        await this.videoElement.play();
      } catch (error) {
        console.error("Error playing video:", error);
      }
    }
  }
  
  private async loadNewChunks(): Promise<void> {
    if (!this.manifest) {
      return;
    }
    
    // Find chunks that haven't been processed yet
    const newChunks = this.manifest.chunks.filter(
      chunk => chunk.index > this.lastProcessedChunkIndex
    );
    
    // Load each new chunk
    for (const chunk of newChunks) {
      await this.loadChunk(chunk);
    }
  }
  
  private async loadChunk(chunk: StreamChunk): Promise<void> {
    try {
      // Skip if we've already processed this chunk
      if (chunk.index <= this.lastProcessedChunkIndex) {
        return;
      }
      
      // Resolve chunk URI to URL
      const chunkUrl = resolveUri(chunk.uri);
      
      // Fetch chunk data
      const response = await fetch(chunkUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch chunk: ${chunk.index}`);
      }
      
      // Get chunk data as ArrayBuffer
      const chunkData = await response.arrayBuffer();
      
      // Add to pending chunks
      this.pendingChunks.push(chunkData);
      
      // Process chunk if possible
      this.processNextPendingChunk();
      
      // Update last processed chunk
      this.lastProcessedChunkIndex = Math.max(this.lastProcessedChunkIndex, chunk.index);
    } catch (error) {
      console.error(`Error loading chunk ${chunk.index}:`, error);
      this.handleError(new Error(`Failed to load chunk ${chunk.index}`));
    }
  }
  
  private processNextPendingChunk(): void {
    // Skip if buffer is updating or no pending chunks
    if (
      this.isBufferUpdating || 
      this.pendingChunks.length === 0 || 
      !this.sourceBuffer
    ) {
      return;
    }
    
    try {
      // Get next chunk
      const nextChunk = this.pendingChunks.shift();
      
      if (!nextChunk) {
        return;
      }
      
      // Mark buffer as updating
      this.isBufferUpdating = true;
      
      // Append chunk to source buffer
      this.sourceBuffer.appendBuffer(nextChunk);
    } catch (error) {
      console.error("Error appending chunk to buffer:", error);
      this.isBufferUpdating = false;
      
      // Try next chunk on error
      this.processNextPendingChunk();
    }
  }
  
  private handleError(error: Error): void {
    if (this.onErrorCallback) {
      this.onErrorCallback(error);
    }
  }
}

// Export all streaming functions and classes
export default {
  createStreamManifest,
  initializeStream,
  uploadStreamChunk,
  updateStreamManifest,
  endStream,
  loadStreamManifest,
  StreamRecorder,
  StreamPlayer
};