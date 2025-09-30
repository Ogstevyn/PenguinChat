import { useMutation } from "@tanstack/react-query";
import { WalrusClient, WalrusFile } from "@mysten/walrus";
import {
    useCurrentAccount,
    useSignAndExecuteTransaction,
    useSuiClient,
} from "@mysten/dapp-kit";
import { BackupData } from "../types/backup";

export const useWalrusBackup = () => {
    const currentAccount = useCurrentAccount();
    const client = useSuiClient();
    const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();

    return useMutation<string, Error, BackupData>({
        mutationFn: async (backupData: BackupData) => {
            if (!currentAccount) {
                throw new Error("Wallet not connected");
            }
            if (!client) {
                throw new Error("Client not available");
            }

            console.log('🔄 Starting Walrus backup upload...');

            const walrusClient = new WalrusClient({
                network: "testnet",
                suiClient: client as any,
                wasmUrl: "https://unpkg.com/@mysten/walrus-wasm@latest/web/walrus_wasm_bg.wasm"
            });

            // Convert BackupData to JSON string, then to Blob
            const jsonString = JSON.stringify(backupData);
            const blob = new Blob([jsonString], { type: 'application/json' });
            
            // Create WalrusFile from the backup data
            const contents = new Uint8Array(await blob.arrayBuffer());
            const walrusFile = WalrusFile.from({ 
                contents, 
                identifier: `penguinchat-backup-${backupData.timestamp}` 
            });

            console.log('📦 Created WalrusFile, starting upload flow...');

            const flow = walrusClient.writeFilesFlow({
                files: [walrusFile],
            });

            await flow.encode();
            console.log('✅ Encoded backup data');

            const registerTx = flow.register({
                owner: currentAccount.address,
                epochs: 1,
                deletable: true,
            });
            
            const { digest } = await signAndExecuteTransaction({
                transaction: registerTx as any,
            });
            console.log('✅ Registered blob with transaction:', digest);

            await flow.upload({ digest });
            console.log('✅ Uploaded data to Walrus storage nodes');

            const certifyTx = flow.certify();
            await signAndExecuteTransaction({
                transaction: certifyTx as any,
            });
            console.log('✅ Certified blob with transaction');

            const fileList = await flow.listFiles();
            const blobId = fileList[0]?.blobId;
            
            if (!blobId) {
                throw new Error('Failed to get blob ID after upload');
            }

            console.log('🎉 Backup uploaded successfully with blob ID:', blobId);
            return blobId;
        },
        onError: (error: any) => {
            console.error('❌ Walrus backup failed:', error.message || "Failed to upload backup");
        },
        onSuccess: (blobId) => {
            console.log("✅ Walrus backup successful, blob ID:", blobId);
        },
    });
};
