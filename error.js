grove.ts:231 
 POST https://api.grove.storage/challenge/new 404 (Not Found)

grove.ts:233 Error updating JSON: AuthorizationError: StorageNode: Could not find resource: c37f5cc9656d5bc01a5e45d1b787298e37921acfc3b94327dec27655278b9fe1
    at async updateJson (grove.ts:231:12)
    at async updateStreamManifest (stream.ts:151:5)
    at async StreamRecorder.processUploadQueue (stream.ts:418:25)
stream.ts:160 Error updating stream manifest: AuthorizationError: StorageNode: Could not find resource: c37f5cc9656d5bc01a5e45d1b787298e37921acfc3b94327dec27655278b9fe1
    at async updateJson (grove.ts:231:12)
    at async updateStreamManifest (stream.ts:151:5)
    at async StreamRecorder.processUploadQueue (stream.ts:418:25)
stream.ts:433 Error processing upload queue: Error: Failed to update stream manifest
    at updateStreamManifest (stream.ts:161:11)
    at async StreamRecorder.processUploadQueue (stream.ts:418:25)
grove.ts:231 
 PUT https://api.grove.storage/c37f5cc……6xaerxgfyfjtew6jkk2ibuhrniq6kuit7ghea24&secret_random=1682381… 422 (Unprocessable Content)
grove.ts:233 Error updating JSON: StorageClientError: The requested resource is not yet available or in a state 
to be able to be edited or deleted, please try again later. 
Hint: you can use the /status endpoint to understand 
when you can edit or delete this resource
    at async updateJson (grove.ts:231:12)
    at async updateStreamManifest (stream.ts:151:5)
    at async StreamRecorder.processUploadQueue (stream.ts:418:25)
stream.ts:160 Error updating stream manifest: StorageClientError: The requested resource is not yet available or in a state 
to be able to be edited or deleted, please try again later. 
Hint: you can use the /status endpoint to understand 
when you can edit or delete this resource
    at async updateJson (grove.ts:231:12)
    at async updateStreamManifest (stream.ts:151:5)
    at async StreamRecorder.processUploadQueue (stream.ts:418:25)
stream.ts:433 Error processing upload queue: Error: Failed to update stream manifest
    at updateStreamManifest (stream.ts:161:11)
    at async StreamRecorder.processUploadQueue (stream.ts:418:25)
﻿


    6f5d43a23d3ed08ea80240d8d30d21961b77235c171131c38f4c9c1bbafbf46a