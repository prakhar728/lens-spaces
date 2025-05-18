/**
 * Grove Storage Client
 * 
 * This library provides helper functions for interacting with Grove Storage,
 * including uploading, downloading, editing, and deleting content.
 */

import { immutable, lensAccountOnly, StorageClient, walletOnly } from "@lens-chain/storage-client";

// If these imports from @lens-chain/sdk and storage-client can't be directly resolved
// mock them until they can be replaced with actual imports
const mockChains = {
  testnet: { id: 37111 },
  mainnet: { id: 232 }
};

// Types
export enum ChainId {
  TESTNET = 37111,
  MAINNET = 232
}

export enum ACLType {
  IMMUTABLE = "immutable",
  LENS_ACCOUNT = "lensAccount",
  WALLET_ADDRESS = "walletAddress",
  GENERIC_CONTRACT_CALL = "genericContractCall"
}

export interface Signer {
  signMessage({ message }: { message: string }): Promise<string>;
}

export interface FileUploadResponse {
  uri: string;
  gatewayUrl: string;
  storageKey: string;
}

export interface UploadOptions {
  acl: any;
}

// Initialize StorageClient
let storageClient: any;

/**
 * Initializes the Grove StorageClient
 * This should be called before any other Grove functions
 * 
 * @returns Initialized StorageClient
 */
export function initializeGroveClient(): any {
  if (!storageClient) {
    try {
      storageClient = StorageClient.create();
    } catch (error) {
      console.error("Error initializing Grove client:", error);
      throw new Error("Failed to initialize Grove client");
    }
  }
  return storageClient;
}


/**
 * Creates Access Control Layer (ACL) configuration
 * 
 * @param aclType - Type of ACL configuration
 * @param address - Address for access control (required for LENS_ACCOUNT and WALLET_ADDRESS)
 * @param chainId - Chain ID (testnet or mainnet)
 * @param contractAddress - Contract address (required for GENERIC_CONTRACT_CALL)
 * @param contractFunction - Contract function (required for GENERIC_CONTRACT_CALL)
 * @returns ACL configuration
 */
export function createACL(
  aclType: ACLType,
  chainId: ChainId = ChainId.TESTNET,
  address?: string,
  contractAddress?: string,
  contractFunction?: string
): any {
  // Ensure client is initialized
  initializeGroveClient();
  
  switch (aclType) {
    case ACLType.IMMUTABLE:
      return immutable(chainId);
      
    case ACLType.LENS_ACCOUNT:
      if (!address) throw new Error("Lens account address is required");
      return lensAccountOnly(address as `0x${string}`, chainId);
      
    case ACLType.WALLET_ADDRESS:
      if (!address) throw new Error("Wallet address is required");
      return walletOnly(address as `0x${string}`, chainId);
      
    default:
      throw new Error("Invalid ACL type");
  }
}

/**
 * Uploads a file to Grove
 * 
 * @param file - File to upload
 * @param options - Upload options including ACL configuration
 * @returns Promise with the upload response
 */
export async function uploadFile(
  file: File,
  options: UploadOptions
): Promise<FileUploadResponse> {
  // Ensure client is initialized
  const client = initializeGroveClient();
  
  try {
    // Check file size (8MB limit as per documentation)
    if (file.size > 8 * 1024 * 1024) {
      throw new Error("File size exceeds 8MB limit");
    }
    
    return await client.uploadFile(file, options);
  } catch (error) {
    console.error("Error uploading file:", error);
    throw error;
  }
}

/**
 * Uploads data as JSON to Grove
 * 
 * @param data - Data to upload as JSON
 * @param options - Upload options including ACL configuration
 * @returns Promise with the upload response
 */
export async function uploadAsJson(
  data: any,
  options: UploadOptions
): Promise<FileUploadResponse> {
  // Ensure client is initialized
  const client = initializeGroveClient();
  console.log(options);
  
  try {
    return await client.uploadAsJson(data, options);
  } catch (error) {
    console.error("Error uploading JSON:", error);
    throw error;
  }
}

/**
 * Uploads a folder to Grove
 * 
 * @param files - Array of Files to upload as a folder
 * @param options - Upload options including ACL configuration
 * @returns Promise with the upload response
 */
export async function uploadFolder(
  files: File[],
  options: UploadOptions
): Promise<FileUploadResponse> {
  // Ensure client is initialized
  const client = initializeGroveClient();
  
  try {
    // Check combined file size (8MB limit as per documentation)
    const totalSize = files.reduce((size, file) => size + file.size, 0);
    if (totalSize > 8 * 1024 * 1024) {
      throw new Error("Combined file size exceeds 8MB limit");
    }
    
    return await client.uploadFolder(files, options);
  } catch (error) {
    console.error("Error uploading folder:", error);
    throw error;
  }
}

/**
 * Edits an existing file on Grove
 * 
 * @param uri - Lens URI of the file to edit
 * @param file - New file content
 * @param signer - Signer for authorization
 * @param options - Upload options including new ACL configuration
 * @returns Promise with the upload response
 */
export async function editFile(
  uri: string,
  file: File,
  signer: Signer,
  options: UploadOptions
): Promise<FileUploadResponse> {
  // Ensure client is initialized
  const client = initializeGroveClient();
  
  try {
    // Check file size (8MB limit as per documentation)
    if (file.size > 8 * 1024 * 1024) {
      throw new Error("File size exceeds 8MB limit");
    }
    
    return await client.editFile(uri, file, signer, options);
  } catch (error) {
    console.error("Error editing file:", error);
    throw error;
  }
}

/**
 * Updates JSON content on Grove
 * 
 * @param uri - Lens URI of the JSON to update
 * @param data - New JSON data
 * @param signer - Signer for authorization
 * @param options - Upload options including new ACL configuration
 * @returns Promise with the upload response
 */
export async function updateJson(
  uri: string,
  data: any,
  signer: Signer,
  options: UploadOptions
): Promise<FileUploadResponse> {
  // Ensure client is initialized
  const client = initializeGroveClient();
  
  try {
    return await client.updateJson(uri, data, signer, options);
  } catch (error) {
    console.error("Error updating JSON:", error);
    throw error;
  }
}

/**
 * Deletes a resource (file or folder) from Grove
 * 
 * @param uri - Lens URI of the resource to delete
 * @param signer - Signer for authorization
 * @returns Promise with the deletion response
 */
export async function deleteResource(
  uri: string,
  signer: Signer
): Promise<{ success: boolean }> {
  // Ensure client is initialized
  const client = initializeGroveClient();
  
  try {
    return await client.delete(uri, signer);
  } catch (error) {
    console.error("Error deleting resource:", error);
    throw error;
  }
}

/**
 * Resolves a Lens URI to a Gateway URL
 * 
 * @param uri - Lens URI to resolve
 * @returns Gateway URL
 */
export function resolveUri(uri: string): string {
  // Ensure client is initialized
  const client = initializeGroveClient();
  
  try {
    return client.resolve(uri);
  } catch (error) {
    console.error("Error resolving URI:", error);
    throw error;
  }
}

/**
 * Utility function to check if a file exceeds the maximum upload size
 * 
 * @param file - File to check
 * @param maxSizeInMB - Maximum size in MB (default: 8MB)
 * @returns Boolean indicating if the file is within size limits
 */
export function isFileSizeValid(file: File, maxSizeInMB: number = 8): boolean {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
}

export default {
  initializeGroveClient,
  createACL,
  uploadFile,
  uploadAsJson,
  uploadFolder,
  editFile,
  updateJson,
  deleteResource,
  resolveUri,
  isFileSizeValid,
  ChainId,
  ACLType,
  // Export ACL creation helpers directly
  immutable,
  lensAccountOnly,
};