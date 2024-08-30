const express = require('express');
const BigchainDB = require('bigchaindb-driver');
const bip39 = require('bip39');
const app = express();
const port = process.env.PORT || 3000;

// BigchainDB setup
const conn = new BigchainDB.Connection(process.env.BIGCHAINDB_URL || 'http://13.235.246.227:9984/api/v1/');

app.use(express.json());

// Function to create an asset
async function createAsset(assetData) {
    try {
        // Generate a mnemonic phrase (e.g., 12-word)
        const mnemonic = bip39.generateMnemonic();
        const seed = await bip39.mnemonicToSeed(mnemonic);
        const key32Bytes = seed.slice(0, 32);
        const keyPair = new BigchainDB.Ed25519Keypair(key32Bytes);

        // Create a transaction in BigchainDB
        const tx = BigchainDB.Transaction.makeCreateTransaction(
            assetData,
            null, // Metadata
            [BigchainDB.Transaction.makeOutput(BigchainDB.Transaction.makeEd25519Condition(keyPair.publicKey))],
            keyPair.privateKey
        );

        // Sign the transaction
        const txSigned = BigchainDB.Transaction.signTransaction(tx, keyPair.privateKey);

        // Post the transaction to BigchainDB
        await conn.postTransactionCommit(txSigned);

        return { success: true, keyPair, txSigned  };
    } catch (error) {
        console.error('Error creating asset:', error);
        return { success: false, error };
    }
}
// Endpoint to create a single asset
app.post('/create-asset', async (req, res) => {
    try {
        // Get asset data from request body or generate random data
        const assetData = {
            price: Math.random() * 1000,
            user: `user-${Math.floor(Math.random() * 1000)}`,
        };

        const result = await createAsset(assetData);

        if (result.success) {
            console.log('Asset created successfully');
            // create a log withd date and time with the response, in formatted manner 

            const data ={
                date: new Date().toLocaleDateString(),
                time: new Date().toLocaleTimeString(),
                response: result
            }
            
            // save this log in a file with proper formatting
            const fs = require('fs');
            fs.appendFile('log.txt', JSON.stringify(data) + '\n', (err) => {
                if (err) {
                    console.error('Error writing log:', err);
                }
            });




            res.status(200).json({ message: 'Asset creation completed', data: result });
        } else {
            res.status(500).json({ message: 'Error during asset creation', error: result.error });
        }
    } catch (error) {
        console.error('Error during asset creation:', error);
        res.status(500).json({ message: 'Error during asset creation', error });
    }
});

// Endpoint to get asset details
app.get('/asset', async (req, res) => {
    try {
        const assetId = req.body.id;
        const assets = await conn.searchAssets(assetId);
        
        if (assets.length > 0) {
            res.status(200).json(assets);
        } else {
            res.status(404).json({ message: 'Asset not found' });
        }
    } catch (error) {
        console.error('Error retrieving asset details:', error);
        res.status(500).json({ message: 'Error retrieving asset details', error });
    }
});

// Endpoint to get transaction details
app.get('/transaction', async (req, res) => {
    try {
        const transactionId = req.body.id;
        const transactions = await conn.getTransaction(transactionId)
        console.log(transactions);
        
        if (transactions) {
            res.status(200).json(transactions);
        } else {
            res.status(404).json({ message: 'Transaction not found' });
        }
    } catch (error) {
        console.error('Error retrieving transaction details:', error);
        res.status(500).json({ message: 'Error retrieving transaction details', error });
    }
});

// Endpoint to transfer an asset
app.post('/transfer-asset', async (req, res) => {
    try {
        const transactionId = req.body.id;
        const recipientPublicKey = req.body.recipientPublicKey;
        const senderPrivateKey = req.body.senderPrivateKey;
        // Get the asset
        const transactions = await conn.getTransaction(transactionId);
        console.log(transactions);
        if (!transactions) {
            return res.status(404).json({ message: 'Asset not found' });
        }

        const asset = transactions.asset;
        const tx = BigchainDB.Transaction.makeTransferTransaction(
            [{ tx: transactions, output_index: 0 }],
            [BigchainDB.Transaction.makeOutput(BigchainDB.Transaction.makeEd25519Condition(recipientPublicKey))],
            { price: asset.data.price, user: asset.data.user, date: new Date().toLocaleDateString(), time: new Date().toLocaleTimeString() }
        );

        
        const txSigned = BigchainDB.Transaction.signTransaction(tx,senderPrivateKey); 

        // Post the transaction to BigchainDB
        await conn.postTransactionCommit(txSigned);

        res.status(200).json({ message: 'Asset transferred successfully', txSigned });
    } catch (error) {
        console.error('Error transferring asset:', error);
        res.status(500).json({ message: 'Error transferring asset', error });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
