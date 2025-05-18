Error updating JSON: StorageClientError: Unauthorized
    at StorageClientError.fromResponse (index.js:100:14)
    at async _StorageClient.editFile (index.js:584:13)
    at async updateJson (grove.ts:231:12)
    at async updateStreamManifest (stream.ts:151:5)
    at async StreamRecorder.processUploadQueue (stream.ts:418:25)
error @ intercept-console-error.js:50
updateJson @ grove.ts:233
await in updateJson
updateStreamManifest @ stream.ts:151
processUploadQueue @ stream.ts:418
await in processUploadQueue
handleDataAvailable @ stream.ts:391Understand this errorAI
stream.ts:160 Error updating stream manifest: StorageClientError: Unauthorized
    at StorageClientError.fromResponse (index.js:100:14)
    at async _StorageClient.editFile (index.js:584:13)
    at async updateJson (grove.ts:231:12)
    at async updateStreamManifest (stream.ts:151:5)
    at async StreamRecorder.processUploadQueue (stream.ts:418:25)
error @ intercept-console-error.js:50
updateStreamManifest @ stream.ts:160
await in updateStreamManifest
processUploadQueue @ stream.ts:418
await in processUploadQueue
handleDataAvailable @ stream.ts:391Understand this errorAI
stream.ts:433 Error processing upload queue: Error: Failed to update stream manifest
    at updateStreamManifest (stream.ts:161:11)
    at async StreamRecorder