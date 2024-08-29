const BigchainDB = require('bigchaindb-driver');
const bip39 = require('bip39');
const fs = require('fs');
const readline = require('readline');

// Setup readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// BigchainDB setup
const conn = new BigchainDB.Connection('http://192.168.15.160:9984/api/v1/');
const RETRY_LIMIT = 3; // Number of retries for failed transactions
let totalCreatedAssets = 0;

async function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function createAsset(assetData, keyPair) {
    for (let attempt = 1; attempt <= RETRY_LIMIT; attempt++) {
        try {
            // Create an asset with the provided data
            const asset = { data: assetData };

            // Create a transaction in BigchainDB
            const tx = BigchainDB.Transaction.makeCreateTransaction(
                asset.data,
                null, // Metadata
                [BigchainDB.Transaction.makeOutput(BigchainDB.Transaction.makeEd25519Condition(keyPair.publicKey))],
                keyPair.privateKey
            );

            // Sign the transaction
            const txSigned = BigchainDB.Transaction.signTransaction(tx, keyPair.privateKey);

            // Post the transaction to BigchainDB
            await conn.postTransactionCommit(txSigned);
            totalCreatedAssets++;
            return; // Exit loop on success
        } catch (error) {
            if (attempt === RETRY_LIMIT) {
                console.error('Error creating asset after multiple attempts:', error);
            } else {
                console.warn('Retrying due to error:', error);
            }
        }
    }
}

async function measureThroughput(totalAssets, batchSize) {
    const startTime = Date.now(); // Record start time

     // Generate a mnemonic phrase (e.g., 12-word)
     const mnemonic = bip39.generateMnemonic(); // 12-word by default

     // Convert mnemonic to seed (returns a Buffer)
     const seed = await bip39.mnemonicToSeed(mnemonic);

     // Extract the first 32 bytes from the seed
     const key32Bytes = seed.slice(0, 32); // Use only the first 32 bytes

     // Generate keypair from seed
     const keyPair = new BigchainDB.Ed25519Keypair(key32Bytes); 
    const assetDataArray = Array.from({ length: totalAssets }, (_, i) => ({
        name: `Asset ${i + 1}`,
        description: `This is asset number ${i + 1} stored in BigchainDB`,
    }));

    // Function to process a batch of assets
    async function processBatch(batch) {
        await Promise.all(batch.map(assetData => createAsset(assetData, keyPair)));
    }

    // Process assets in batches
    for (let i = 0; i < totalAssets; i += batchSize) {
        const batch = assetDataArray.slice(i, i + batchSize);
        await processBatch(batch);
        console.log('Batch completed:', i + batchSize);
    }

    const endTime = Date.now(); // Record end time
    const duration = (endTime - startTime) / 1000; // Duration in seconds

    // Prepare log data
    const logData = `
Date: ${new Date().toLocaleString()}
Total assets created: ${totalCreatedAssets}
Total time taken: ${duration} seconds
Throughput: ${totalCreatedAssets / duration} assets per second
Batch size: ${batchSize}
`;

    // Write log data to a file
    fs.writeFile('throughput.log', logData, (err) => {
        if (err) {
            console.error('Error writing to file:', err);
        } else {
            console.log('Log file created: throughput.log');
        }
    });

    rl.close(); // Close readline interface
}

// Main function to prompt user input and start the process
async function main() {
    const totalAssets = parseInt(await askQuestion('Enter the total number of assets: '), 10) || 10000;
    const batchSize = parseInt(await askQuestion('Enter the batch size for transactions: '), 10) || 200;

    console.log(`Total assets: ${totalAssets}`);
    console.log(`Batch size: ${batchSize}`);

    console.log('Creating assets...');
    
    await measureThroughput(totalAssets, batchSize);
}

// Start the interactive prompts
main();
