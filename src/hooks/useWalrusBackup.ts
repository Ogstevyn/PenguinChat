import { useMutation, useQuery } from "@tanstack/react-query";
import { WalrusClient, WalrusFile, blobIdFromInt } from "@mysten/walrus";
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

    const walrusClient = new WalrusClient({
        network: "testnet",
        suiClient: client as any,
        wasmUrl: "https://unpkg.com/@mysten/walrus-wasm@latest/web/walrus_wasm_bg.wasm"
    });

    // Helper function to get sorted blobs (newest first)
    const getSortedBlobs = async (address: string) => {

        // Step 1: Fetch owned objects of type Blob
        const objects = await client.getOwnedObjects({
            owner: address,
            filter: {
                StructType: "0xd84704c17fc870b8764832c535aa6b11f21a95cd6f5bb38a9b07d2cf42220c66::blob::Blob",
            },
            options: {
                showContent: true,
                showType: true,
                showOwner: true,
                showPreviousTransaction: true,
            },
        });

        // Step 2: Attach timestamps by fetching transaction info
        const withTimestamps = await Promise.all(
            objects.data.map(async (obj) => {
                const digest = obj.data?.previousTransaction;
                let timestamp = 0;

                if (digest) {
                    try {
                        const tx = await client.getTransactionBlock({
                            digest,
                            options: { showInput: false, showEffects: false, showEvents: false },
                        });

                        timestamp = tx.timestampMs ? Number(tx.timestampMs) : 0;
                    } catch (err) {
                        console.error(`Failed to fetch tx for digest ${digest}:`, err);
                    }
                }

                return { ...obj, timestamp };
            })
        );

        // Step 3: Sort newest → oldest
        const sortedObjects = withTimestamps.sort((a, b) => b.timestamp - a.timestamp);

        return sortedObjects;
    };

    const uploadMutation = useMutation<string, Error, BackupData>({
        mutationFn: async (backupData: BackupData) => {
            if (!currentAccount) {
                throw new Error("Wallet not connected");
            }
            if (!client) {
                throw new Error("Client not available");
            }

            console.log('🔄 Starting Walrus backup upload...');

            // Create a proper JSON file
            const jsonString = JSON.stringify(backupData, null, 2);
            const jsonBlob = new Blob([jsonString], { 
                type: 'application/json',
            });
            
            const walrusFile = WalrusFile.from({ 
                contents: jsonBlob, 
                identifier: `penguinchat-backup-${backupData.timestamp}.json` 
            });

            console.log('�� Created WalrusFile from JSON blob, starting upload flow...');

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

    // Add query for getting user's blob objects
    const getUserBlobsQuery = useQuery({
        queryKey: ['walrus-blobs', currentAccount?.address],
        queryFn: async () => {
            if (!currentAccount || !client) {
                throw new Error("Wallet not connected");
            }

            console.log('🔍 Fetching sorted blob objects from Sui blockchain...');

            // Get sorted blobs (newest first)
            const sortedBlobs = await getSortedBlobs(currentAccount.address);
            console.log(`🔍 Found ${sortedBlobs.length} blob objects, sorted by timestamp`);

            // Find PenguinChat backups (stop at first one found since they're sorted)
            const penguinChatBackups = [];
            
            for (const obj of sortedBlobs) {
                try {
                    //@ts-ignore
                    const blobIdString = obj.data.content.fields.blob_id;
                    let blobId;

                    if (blobIdString) {
                        blobId = blobIdFromInt(blobIdString);
                        console.log('🔍 Checking blob ID:', blobId);
                    } else {
                        throw new Error('No blob ID found');
                    }
                    if (blobId) {
                        // Read the blob content directly from Walrus
                        console.log('🔍 READING Blob ID:', blobId);
                        const result = await walrusClient.readBlob({ blobId });
                        const textResult = new TextDecoder().decode(result);
                        console.log(textResult);
                        const backupData = JSON.parse(textResult);
                        console.log('🔍 Backup data:', backupData);

                        if (backupData.appId === 'penguinchat') {
                            const backup = {
                                //@ts-ignore
                                objectId: obj.objectId,
                                blobId: blobId,
                                timestamp: backupData.timestamp,
                                version: backupData.version,
                                messageCount: Object.values(backupData.conversations).reduce((sum: number, msgs: any) => sum + msgs.length, 0),
                                backupData: backupData,
                                transactionTimestamp: obj.timestamp
                            };
                            
                            penguinChatBackups.push(backup);
                            console.log(`✅ Found PenguinChat backup: ${backup.messageCount} messages, timestamp: ${backup.timestamp}`);
                            
                            // Since blobs are sorted by newest first, we can stop here
                            // to get only the most recent backup, or continue to get all backups
                            // For now, let's get all PenguinChat backups
                        }
                    }
                } catch (error) {
                    //@ts-ignore
                    console.log(`⚠️ Skipping invalid blob object ${obj.objectId}:`, error);
                }
            }

            console.log(`✅ Found ${penguinChatBackups.length} PenguinChat backups (newest first)`);
            return penguinChatBackups;
        },
        enabled: !!currentAccount && !!client,
        staleTime: 30000, // 30 seconds
        refetchInterval: 60000, // 1 minute
    });

    return {
        upload: uploadMutation,
        getUserBlobs: getUserBlobsQuery,
        isUploading: uploadMutation.isPending,
        uploadError: uploadMutation.error?.message || null,
        isFetchingBlobs: getUserBlobsQuery.isFetching,
        blobs: getUserBlobsQuery.data || [],
        blobsError: getUserBlobsQuery.error?.message || null,
    };
};
