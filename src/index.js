const express = require('express');
const BigchainDB = require('bigchaindb-driver');
const bip39 = require('bip39');

const app = express();
const port = 3000;

// BigchainDB setup
const conn = new BigchainDB.Connection('http://192.168.15.160:9984/api/v1/');

app.use(express.json());

// Function to create a random asset
async function createRandomAsset(assetData) {
    try {
        

        const mnemonic = bip39.generateMnemonic();
        const seed = await bip39.mnemonicToSeed(mnemonic);
        const key32Bytes = seed.slice(0, 32);
        const keyPair = new BigchainDB.Ed25519Keypair(key32Bytes);
        const tx = BigchainDB.Transaction.makeCreateTransaction(
            assetData,
            null,
            [BigchainDB.Transaction.makeOutput(BigchainDB.Transaction.makeEd25519Condition(keyPair.publicKey))],
            keyPair.privateKey
        );
        const txSigned = BigchainDB.Transaction.signTransaction(tx, keyPair.privateKey);
        await conn.postTransactionCommit(txSigned);
    } catch (error) {
        console.log('Error creating asset:', error);
    }
}

let j = 0;
// Endpoint to create a single asset
app.post('/create-asset', async (req, res) => {
    try {
        // Generate random data for the asset
        const assetData = {
            price: Math.random() * 1000,
            user: `user-${Math.floor(Math.random() * 1000)}`,
        };

        // Create the asset

        await createRandomAsset(assetData);

        j++;
        console.log('Asset created:', j);
        
        // await createRandomAsset(assetData);
        res.status(200).send('Asset creation completed');
    } catch (error) {
        console.error('Error during asset creation:', error);
        res.status(500).send('Error during asset creation');
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
