# BigChainDB Throughput Measurement Tool

## Ubuntu server 
Create a virtual ubunntu server with required ram and core 

### Run the following for starting the BigChainDB on the server
```bash
git clone https://github.com/bigchaindb/bigchaindb.git
cd bigchaindb
make run
```


## Running the Project
```bash
npm install
```
make sure to change the ipaddress from the connection string 
```bash
const conn = new BigchainDB.Connection('http://<your_ip_here>:9984/api/v1/');
```

```bash
node index.js
```


## Interactive Prompts:

You will be prompted to enter:

**Total number of assets:** The total number of assets you want to create.

**Starting count for assets:** The starting index for asset numbering.

**Batch size for transactions:** Number of assets to process in each batch.
You can press Enter to use the default values:

### Default Values:
Total number of assets:**10000**

Starting count for assets:**0**

Batch size for transactions:**200**


## Output:

After execution, the results will be logged in **throughput.log** with the following details:

Total assets created

Total time taken (in seconds)

Throughput (assets per second)

Batch size used
