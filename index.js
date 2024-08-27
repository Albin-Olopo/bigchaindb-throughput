const BigchainDB = require('bigchaindb-driver');
const bip39 = require('bip39');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Setup readline interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// BigchainDB setup
const conn = new BigchainDB.Connection('http://192.168.15.160:9984/api/v1/');
let j = 0;
let errorStart = 0;

async function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function createAsset(assetData) {
    try {
        // Generate a mnemonic phrase (e.g., 12-word)
        const mnemonic = bip39.generateMnemonic(); // 12-word by default

        // Convert mnemonic to seed (returns a Buffer)
        const seed = await bip39.mnemonicToSeed(mnemonic);

        // Extract the first 32 bytes from the seed
        const key32Bytes = seed.slice(0, 32); // Use only the first 32 bytes

        // Generate keypair from seed
        const keyPair = new BigchainDB.Ed25519Keypair(key32Bytes); 

        // Create an asset with the provided data
        const asset = {
            data: assetData,
        };

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
        j++;
        
    } catch (error) {
        if (!errorStart) {
            console.error('Error:', error);
            errorStart = j;
        }
        console.log('Asset not created:', j);
    }
}

async function measureThroughput( totalAssets, startCount, batchSize) {
    const startTime = Date.now(); // Record the start time

    // Prepare the asset data
    const assetDataArray = Array.from({ length: totalAssets }, (_, i) => ({
        name: `Asset ${startCount + i + 1}`,
        description: `This is asset number ${startCount + i + 1} stored in BigchainDB`,
    }));

    // Run the function to create assets
    for (let i = 0; i < totalAssets; i += batchSize) {
        const batch = assetDataArray.slice(i, i + batchSize);
        await Promise.all(batch.map((assetData) => createAsset(assetData)));
        console.log('Batch completed:', i + batchSize);
    }

    const endTime = Date.now(); // Record the end time
    const duration = (endTime - startTime) / 1000; // Duration in seconds

    // Prepare log data
    const logData = `Total assets created: ${j}\nTotal time taken: ${duration} seconds\nThroughput: ${j / duration} assets per second\n Batch size: ${batchSize}\n`;

    // Write log data to a file
    fs.access('throughput.log', fs.constants.F_OK, (err) => {
        if (!err) {
            // If the file exists, append the log
            fs.appendFile('throughput.log', logData, (err) => {
                if (err) {
                    console.error('Error appending to file:', err);
                } else {
                    console.log('Log appended to file: throughput.log');
                }
            });
        } else {
            // If the file does not exist, create the file and write the log
            fs.writeFile('throughput.log', logData, (err) => {
                if (err) {
                    console.error('Error writing to file:', err);
                } else {
                    console.log('Log file created: throughput.log');
                }
            });
        }
    });

    rl.close(); // Close readline interface
}

// Prompt user for input
async function main() {
    const totalAssets = parseInt(await askQuestion('Enter the total number of assets: '), 10) || 10000;
    const startCount = parseInt(await askQuestion('Enter the starting count for assets: '), 10) || 0;
    const batchSize = parseInt(await askQuestion('Enter the batch size for transactions: '), 10) || 200;

    console.log(`Total assets: ${totalAssets}`);
    console.log(`Start count: ${startCount}`);
    console.log(`Batch size: ${batchSize}`);

    console.log('Creating assets...');
    
    await measureThroughput(totalAssets, startCount, batchSize);
}

// Start the interactive prompts
main();
