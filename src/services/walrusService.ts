import { BackupData, SuiBlobObject } from '../types/backup';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import walrusWasmUrl from '@mysten/walrus-wasm/web/walrus_wasm_bg.wasm?url';
import { WalrusClient, RetryableWalrusClientError } from "@mysten/walrus";
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { LITE_SERVER } from '@/config';

export class WalrusService {
  private client: SuiClient;
  private keypair: Ed25519Keypair;
  private walrusClient: WalrusClient;
  private penguinChat: any[];

  constructor(privateKey: string) {
    this.client = new SuiClient({ url: getFullnodeUrl('testnet') });
    this.keypair = Ed25519Keypair.fromSecretKey(privateKey);
    this.walrusClient = new WalrusClient({ 
      network: "testnet", 
      wasmUrl: walrusWasmUrl, 
      suiClient: this.client,
      storageNodeClientOptions: {
        timeout: 60_000,
      },
    });
    this.penguinChat = [];
  }

  async uploadBackup(backupData: BackupData): Promise<string> {
    return '';
    try {
      const data = JSON.stringify(backupData);
      const dataBytes = new TextEncoder().encode(data);
      const userAddress = useCurrentAccount();
      const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

      // Step 1: Encode the blob
      const encoded = await this.walrusClient.encodeBlob(dataBytes);
      console.log('Encoded blob:', encoded);

      // Step 2: Check account balance
      const balance = await this.client.getBalance({ owner: userAddress.address });
      console.log('Account Balance:', balance.totalBalance);

      // Step 3: Register blob transaction
      const registerBlobTransaction = await this.walrusClient.registerBlobTransaction({
        blobId: encoded.blobId,
        rootHash: encoded.rootHash,
        size: dataBytes.byteLength,
        deletable: true,
        epochs: 3,
        owner: userAddress.address,
      });
      
      registerBlobTransaction.setSender(userAddress.address);
      registerBlobTransaction.setGasBudget(1000000000);

      // Step 4: Execute register transaction
      
      const { digest } = await signAndExecute({
        // @ts-ignore
        transaction: registerBlobTransaction,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });
      //const { digest } = await this.client.signAndExecuteTransaction({ transaction: registerBlobTransaction, signer: userAddress });
      console.log('Register transaction digest:', digest);

      // Step 5: Wait for transaction and get object changes
      const { objectChanges, effects } = await this.client.waitForTransaction({
        digest,
        options: { showObjectChanges: true, showEffects: true },
      });

      if (effects?.status.status !== 'success') {
        throw new Error('Failed to register blob');
      }

      // Step 6: Find the created blob object
      const blobType = await this.walrusClient.getBlobType();
      const blobObject = objectChanges?.find(
        (change) => change.type === 'created' && change.objectType === blobType,
      ) as any;

      if (!blobObject || blobObject.type !== 'created') {
        throw new Error('Blob object not found');
      }

      // Step 7: Write encoded blob to nodes
      const confirmations = await this.walrusClient.writeEncodedBlobToNodes({
        blobId: encoded.blobId,
        metadata: encoded.metadata,
        sliversByNode: encoded.sliversByNode,
        deletable: true,
        objectId: blobObject.objectId,
      });

      // Step 8: Certify blob transaction
      const certifyBlobTransaction = await this.walrusClient.certifyBlobTransaction({
        blobId: encoded.blobId,
        blobObjectId: blobObject.objectId,
        confirmations,
        deletable: true,
      });
      certifyBlobTransaction.setSender(userAddress.address);

      // Step 9: Execute certify transaction
      const { digest: certifyDigest } = await signAndExecute({
        // @ts-ignore
        transaction: certifyBlobTransaction,
      });

      // Step 10: Wait for certification
      const { effects: certifyEffects } = await this.client.waitForTransaction({
        digest: certifyDigest,
        options: { showEffects: true },
      });

      if (certifyEffects?.status.status !== 'success') {
        throw new Error('Failed to certify blob');
      }

      console.log('Backup uploaded successfully with blob ID:', encoded.blobId);
      return encoded.blobId;
    } catch (error) {
      console.error('Failed to upload backup to blockchain:', error);
      throw error;
    }
  }

  async downloadBackup(blobId: string): Promise<BackupData> {
    try {
      // For now, return null since we'll use getUserBlobObjects instead
      return null;
    } catch {
      return null;
    }
  }
  
  async getUserBlobObjects(userAddress: string): Promise<SuiBlobObject[]> {
    try {
      const response = await fetch(`${LITE_SERVER}/api/penguinchat-backups/${userAddress}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch backups');
      }
      
      // Convert the API response to the expected format
      return data.backups.map((backup: any) => ({
        objectId: backup.objectId,
        version: '1',
        digest: '',
        type: 'blob',
        owner: {
          AddressOwner: userAddress,
        },
        previousTransaction: '',
        storageRebate: '',
        reference: {
          objectId: backup.objectId,
          version: '1',
          digest: '',
        },
        data: {
          dataType: 'moveObject',
          type: 'blob',
          has_public_transfer: false,
          fields: {
            blob_id: backup.blobId,
          },
        },
      }));
    } catch (error) {
      console.error('Failed to get user blob objects from API:', error);
      throw error;
    }
  }
  
  async getPenguinChatBackups(userAddress: string): Promise<any[]> {
    try {
      // Use the lite-server API directly
      const response = await fetch(`${LITE_SERVER}/api/penguinchat-backups/${userAddress}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch backups');
      }
      
      // Return the backups with blobId for downloadBackup calls
      return data.backups.map((backup: any) => ({
        blobId: backup.blobId,
        backupData: null, // Will be fetched separately if needed
        timestamp: backup.timestamp,
        messageCount: backup.messageCount,
      }));
    } catch (error) {
      console.error('Failed to get PenguinChat backups from API:', error);
      throw error;
    }
  }

  private isPenguinChatBackup(backupData: any): boolean {
    return (
      backupData &&
      typeof backupData === 'object' &&
      backupData.appId === 'penguinchat' &&
      backupData.version &&
      backupData.conversations &&
      typeof backupData.conversations === 'object' &&
      typeof backupData.timestamp === 'number'
    );
  }
}
