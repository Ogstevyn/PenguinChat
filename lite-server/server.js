const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { WalrusClient, RetryableWalrusClientError, blobIdFromInt } = require('@mysten/walrus');
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

let walrusClient;
let keypair;
let suiClient;

const initializeWalrus = async () => {
  try {
    const network = process.env.WALRUS_NETWORK || 'testnet';
    const privateKey = process.env.PRIVATE_KEY || 'suiprivkey1qpqywg8f9kdhcfs3j23l0g0ejljxdawmxkjyypfs58ggzuj5j5hhxy7gaex';
    
    keypair = Ed25519Keypair.fromSecretKey(privateKey);
    
    suiClient = new SuiClient({
      url: getFullnodeUrl(network),
    });

    walrusClient = new WalrusClient({
      network,
      suiClient,
    });

    console.log('✅ Walrus client initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Walrus client:', error);
  }
};

// Routes
app.post('/api/backup', async (req, res) => {
  try {
    if (!walrusClient) {
      return res.status(500).json({ error: 'Walrus client not initialized' });
    }

    const { backupData } = req.body;
    
    if (!backupData) {
      return res.status(400).json({ error: 'Backup data is required' });
    }

    // Validate PenguinChat backup data
    if (!backupData.appId || backupData.appId !== 'penguinchat') {
      return res.status(400).json({ error: 'Invalid backup data: missing or invalid appId' });
    }

    console.log('🔄 Uploading PenguinChat backup:', {
      appId: backupData.appId,
      version: backupData.version,
      messageCount: Object.values(backupData.conversations).reduce((sum, msgs) => sum + msgs.length, 0),
      timestamp: backupData.timestamp
    });

    const fileBytes = new TextEncoder().encode(JSON.stringify(backupData));
    
    const upload = () => walrusClient.writeBlob({
      blob: fileBytes,
      deletable: true,
      epochs: 1,
      signer: keypair,
    });

    const result = await upload().catch((error) => {
      if (error instanceof RetryableWalrusClientError) {
        console.log('Retrying upload...');
        return upload();
      }
      throw error;
    });

    const blobId = typeof result === 'string' ? result : result.blobId;
    
    console.log('✅ PenguinChat backup uploaded successfully:', blobId);
    
    res.json({
      success: true,
      blobId,
      blobObject: result.blobObject, // Include the Sui object info
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('❌ Backup upload failed:', error);
    res.status(500).json({ 
      error: 'Backup upload failed',
      message: error.message 
    });
  }
});

app.get('/api/backup/:blobId', async (req, res) => {
  try {
    if (!walrusClient) {
      return res.status(500).json({ error: 'Walrus client not initialized' });
    }

    const { blobId } = req.params;
    
    console.log('📥 Downloading backup:', blobId);

    const result = await walrusClient.readBlob({
      blobId,
    });

    const textResult = new TextDecoder().decode(result);
    const backupData = JSON.parse(textResult);
    
    console.log('✅ Backup downloaded successfully');
    
    res.json({
      success: true,
      backupData
    });

  } catch (error) {
    console.error('❌ Backup download failed:', error);
    res.status(500).json({ 
      error: 'Backup download failed',
      message: error.message 
    });
  }
});

app.get('/api/user-blobs/:userAddress', async (req, res) => {
  try {
    if (!suiClient) {
      return res.status(500).json({ error: 'Sui client not initialized' });
    }

    const { userAddress } = req.params;
    
    console.log('🔍 Querying wallet for blob objects:', userAddress);

    // Query user's wallet for all blob objects
    const userObjects = await suiClient.getOwnedObjects({
      owner: userAddress,
      filter: {
        StructType: "0xd84704c17fc870b8764832c535aa6b11f21a95cd6f5bb38a9b07d2cf42220c66::blob::Blob"
      },
      options: {
        showContent: true,
        showType: true,
        showOwner: true,
        showPreviousTransaction: true,
        showStorageRebate: true,
        showDisplay: false,
      }
    });

    console.log(`✅ Found ${userObjects.data.length} blob objects for ${userAddress}`);
    
    res.json({
      success: true,
      objects: userObjects.data,
      total: userObjects.data.length
    });

  } catch (error) {
    console.error('❌ Failed to get user blob objects:', error);
    res.status(500).json({ 
      error: 'Failed to get user blob objects',
      message: error.message 
    });
  }
});

app.get('/api/penguinchat-backups/:userAddress', async (req, res) => {
  try {
    if (!suiClient || !walrusClient) {
      return res.status(500).json({ error: 'Clients not initialized' });
    }

    const { userAddress } = req.params;
    
    console.log('🔍 Querying wallet for PenguinChat backups:', userAddress);

    // Query user's wallet for all blob objects
    const userObjects = await suiClient.getOwnedObjects({
      owner: userAddress,
      filter: {
        StructType: "0xd84704c17fc870b8764832c535aa6b11f21a95cd6f5bb38a9b07d2cf42220c66::blob::Blob"
      },
      options: {
        showContent: true,
        showType: true,
        showOwner: true,
        showPreviousTransaction: true,
        showStorageRebate: true,
        showDisplay: false,
      }
    });

    // Filter for PenguinChat backups
    const penguinChatBackups = [];
    
    for (const obj of userObjects.data) {
      try {
        const blobIdString = obj.data?.content?.fields?.blob_id;
        let blobId;

        if (blobIdString) {
          blobId = blobIdFromInt(blobIdString);
          console.log('🔍 Blob ID:', blobId);
        } else {
          blobId = obj.objectId;
        }

        if (blobId) {
          const result = await walrusClient.readBlob({ blobId });
          const textResult = new TextDecoder().decode(result);
          const backupData = JSON.parse(textResult);
          console.log('🔍 Backup data:', backupData);

          console.log('App id:', backupData.appId);
          
          
          if (backupData.appId === 'penguinchat') {
            penguinChatBackups.push({
              objectId: obj.objectId,
              blobId: blobId,
              timestamp: backupData.timestamp,
              version: backupData.version,
              messageCount: Object.values(backupData.conversations).reduce((sum, msgs) => sum + msgs.length, 0),
              backupData: backupData
            });
          }
        }
      } catch (error) {
        console.log(`⚠️ Skipping invalid blob object ${obj.objectId}:`, error.message);
      }
    }

    console.log(`✅ Found ${penguinChatBackups.length} PenguinChat backups out of ${userObjects.data.length} total blob objects`);
    
    res.json({
      success: true,
      backups: penguinChatBackups,
      total: penguinChatBackups.length,
      totalBlobs: userObjects.data.length
    });

  } catch (error) {
    console.error('❌ Failed to get PenguinChat backups:', error);
    res.status(500).json({ 
      error: 'Failed to get PenguinChat backups',
      message: error.message 
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    walrusInitialized: !!walrusClient,
    suiInitialized: !!suiClient,
    timestamp: Date.now()
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  await initializeWalrus();
});
