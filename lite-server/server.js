const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { WalrusClient, RetryableWalrusClientError } = require('@mysten/walrus');
const { SuiClient, getFullnodeUrl } = require('@mysten/sui/client');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize Walrus client
let walrusClient;
let keypair;

const initializeWalrus = async () => {
  try {
    const network = process.env.WALRUS_NETWORK || 'testnet';
    const privateKey = process.env.PRIVATE_KEY || 'suiprivkey1qpqywg8f9kdhcfs3j23l0g0ejljxdawmxkjyypfs58ggzuj5j5hhxy7gaex';
    
    keypair = Ed25519Keypair.fromSecretKey(privateKey);
    
    const suiClient = new SuiClient({
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

    console.log('🔄 Uploading backup:', {
      messageCount: Object.values(backupData.conversations).reduce((sum, msgs) => sum + msgs.length, 0),
      previousBlobId: backupData.previousBlobId,
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
    
    console.log('✅ Backup uploaded successfully:', blobId);
    
    res.json({
      success: true,
      blobId,
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

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    walrusInitialized: !!walrusClient,
    timestamp: Date.now()
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  await initializeWalrus();
});
