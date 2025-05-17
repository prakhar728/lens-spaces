import { StorageClient } from "@lens-chain/storage-client";

const storageClient = StorageClient.create(); 


/**
 * Grove Storage Client Helper Functions
 * 
 * This file provides helper functions for interacting with Grove Storage,
 * including uploading, downloading, editing, and deleting content.
 */

import { chains } from "@lens-chain/sdk/viem";
import {
  StorageClient,
  immutable,
  lensAccountOnly,
  walletAddressOnly,
  genericContractCall,
  FileUploadResponse
} from "@lens-chain/storage-client";

// Types
export interface Signer {
  signMessage({ message }: { message: string }): Promise<string>;
}

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

export interface UploadOptions {
  acl: any;
}

// Initialize StorageClient
const storageClient = new StorageClient();

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
) {
  switch (aclType) {
    case ACLType.IMMUTABLE:
      return immutable(chainId);
      
    case ACLType.LENS_ACCOUNT:
      if (!address) throw new Error("Lens account address is required");
      return lensAccountOnly(address, chainId);
      
    case ACLType.WALLET_ADDRESS:
      if (!address) throw new Error("Wallet address is required");
      return walletAddressOnly(address, chainId);
      
    case ACLType.GENERIC_CONTRACT_CALL:
      if (!contractAddress || !contractFunction) 
        throw new Error("Contract address and function are required");
      return genericContractCall(contractAddress, contractFunction, chainId);
      
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
  try {
    return await storageClient.uploadFile(file, options);
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
  try {
    return await storageClient.uploadAsJson(data, options);
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
  try {
    return await storageClient.uploadFolder(files, options);
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
  try {
    return await storageClient.editFile(uri, file, signer, options);
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
  try {
    return await storageClient.updateJson(uri, data, signer, options);
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
  try {
    return await storageClient.delete(uri, signer);
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
  try {
    return storageClient.resolve(uri);
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

/**
 * Example usage
 */
/*
// Example 1: Upload a file with Lens Account ACL
const aclConfig = createACL(
  ACLType.LENS_ACCOUNT,
  ChainId.TESTNET,
  "0x1234..."
);

// Get file from input element
const fileInput = document.getElementById('fileInput') as HTMLInputElement;
const file = fileInput.files?.[0];

if (file && isFileSizeValid(file)) {
  uploadFile(file, { acl: aclConfig })
    .then(response => {
      console.log("File uploaded:", response.uri);
      console.log("Gateway URL:", response.gatewayUrl);
    })
    .catch(error => {
      console.error("Upload failed:", error);
    });
}

// Example 2: Edit a file
const walletClient = /* your wallet client */;/*
const newFile = /* new file */;/*

editFile("lens://323c0e1cceb...", newFile, walletClient, { acl: aclConfig })
  .then(response => {
    console.log("File edited:", response.uri);
  })
  .catch(error => {
    console.error("Edit failed:", error);
  });
*/

export default {
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
  ACLType
};