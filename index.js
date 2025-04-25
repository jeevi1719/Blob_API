require('dotenv').config();
const express = require('express');
const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob');
const fs = require('fs');
const path = require('path');

const multer = require('multer');

const app = express();
const port = process.env.PORT || 3000;

// // Environment variables (make sure to set these in your environment)
// const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
// const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
// const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;

// if (!accountName || !accountKey || !containerName) {
//   throw new Error('AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_ACCOUNT_KEY, and AZURE_STORAGE_CONTAINER_NAME must be set');
// }

// const credentials = new StorageSharedKeyCredential(accountName, accountKey);
// const blobServiceClient = new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, credentials);

// app.get('/blob', async (req, res) => {
//   const blobName = req.query.name;

//   if (!blobName) {
//     return res.status(400).send('Blob name is required as a query parameter');
//   }

//   try {
//     const containerClient = blobServiceClient.getContainerClient(containerName);
//     const blobClient = containerClient.getBlobClient(blobName);
//     const downloadBlockBlobResponse = await blobClient.download();

//     // Convert stream to buffer
//     const buffer = await streamToBuffer(downloadBlockBlobResponse.readableStreamBody);

//     res.setHeader('Content-Type', downloadBlockBlobResponse.contentType);
//     res.send(buffer);
//   } catch (error) {
//     res.status(500).send(`Error retrieving blob: ${error.message}`);
//   }
// });

// async function streamToBuffer(readableStream) {
//   return new Promise((resolve, reject) => {
//     const chunks = [];
//     readableStream.on('data', (data) => {
//       chunks.push(data instanceof Buffer ? data : Buffer.from(data));
//     });
//     readableStream.on('end', () => {
//       resolve(Buffer.concat(chunks));
//     });
//     readableStream.on('error', reject);
//   });
// }

const containerName1 = 'sffiles';

const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);

const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('file'), async (req, res) => {
    const file = req.file;
    const folderPath = req.body.folderPath;
    if (!file) {
        return res.status(400).send('No file uploaded.');
    }

    try {
        // Get the container client
        const containerClient = blobServiceClient.getContainerClient(containerName1);

        // Get the file path and name
        const filePath = file.path;
        const fileName = file.originalname;
        if(folderPath){
            fileName = folderPath+'/'+file.originalname;
        }
        
        // Create the blob client
        const blockBlobClient = containerClient.getBlockBlobClient(fileName);

        // Read the file into a buffer
        const fileData = fs.readFileSync(filePath);

        // Upload the file
        await blockBlobClient.upload(fileData, fileData.length);

        // Delete the temporary file
        fs.unlinkSync(filePath);

        res.status(200).json({
            // `"File uploaded successfully". Blob URL: ${blockBlobClient.url}`
            Status: "File uploaded successfully",
            Blob_URL: `${blockBlobClient.url}`,
            Preview_URL: `https://azureblob-cfe6g7g5gfcxb5ek.canadacentral-01.azurewebsites.net/preview/${file.originalname}`,
            json:'testfolder>>>'+folderPath
     });
    } catch (error) {
        console.error('Error uploading file:', error.message);
        res.status(500).send('Error uploading file'+error.message);
    }
});

app.post('/createcontainer',async (req, res) => {
    try{
        const containerName = 'parentcontainer';

        console.log('\nCreating container...');
        console.log('\t', containerName);
        
        // Get a reference to a container
        const containerClient = blobServiceClient.getContainerClient(containerName);
        // Create the container
        const createContainerResponse = await containerClient.create();
        console.log(
          `Container was created successfully.\n\trequestId:${createContainerResponse.requestId}\n\tURL: ${containerClient.url}`
        );
        res.json({
            requestId: createContainerResponse.requestId,
            Status: "Container created successfully",
            Container_URL: `${containerClient.url}`  
        })
    } catch (error) {
        res.status(500).send('Error Creating Container'+error.message);
    }
    
})


app.get('/blob', async (req, res) => {
  // module.exports = async function (context, req) {
      // replace with your container name
  
      try {
          const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
          const containerClient = blobServiceClient.getContainerClient(containerName1);
          const blobs = [];
          for await (const blob of containerClient.listBlobsFlat()) {
            // console.log(blob,"------------");
              blobs.push({
                name: blob.name,
                size: blob.properties.contentLength,
                lastModified: blob.properties.lastModified

              });
          }
         
          // res = {
          //     status: 200,
          //     body: blobs
          // };
          res.json(blobs)
      } catch (error) {
          // context.log.error(error.message);
          // res = {
          //     status: 500,
          //     body: `Error listing blobs: ${error.message}`
          // };
      }
  // };
  })

  app.get('/preview/:blobName', async (req, res) => {
    const blobName = req.params.blobName;

    try {
        const containerClient = blobServiceClient.getContainerClient(containerName1);
        const blobClient = containerClient.getBlobClient(blobName);
        const downloadBlockBlobResponse = await blobClient.download(0);
        
        // Set appropriate content type for previewing
        const contentType = downloadBlockBlobResponse.contentType;
        res.setHeader('Content-Type', contentType);

        // Pipe the blob content to the response
        downloadBlockBlobResponse.readableStreamBody.pipe(res);
    } catch (error) {
        console.error('Error downloading blob:', error.message);
        res.status(500).send('Error retrieving blob');
    }
});



app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
