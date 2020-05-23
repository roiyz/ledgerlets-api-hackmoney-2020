#!/usr/bin/env python3
#The following python agent is reponsible for doing the folllowing things:
#1) Scan the jobs table and look for open, un marked entries
#2) Create a signatures document
#3) SHA1 and SHA256 the document in #3
#4) Use send 1 wei to the SHA1 address with the SHA256 as the data from #3
#5) Update the transactions table
#6) Upload the file from #3 to a shared blob
#7) Update the global stats entries
import configparser
from web3 import Web3
import azure.common
import azure.storage
from azure.storage.blob import BlockBlobService, PublicAccess
import os, uuid, sys
import time
from datetime import datetime, timezone 
import binascii

from datetime import datetime, timedelta
#from azure.storage.table import TableService
from azure.cosmosdb.table.tableservice import TableService
from azure.cosmosdb.table.models import Entity
import hashlib

#Check for env variables
if "AZURE_STORAGE_ACCOUNT" in os.environ and "AZURE_STORAGE_ACCESS_KEY" in os.environ:
    print("Found needed env variables, starting...")
else:
    print("Missing required azure storge settings from environment variables AZURE_STORAGE_ACCOUNT or AZURE_STORAGE_ACCESS_KEY. Exiting")
    exit()


table_name = "BCProof"
container_name="batches"
batches_tble_name = 'Batches'

def main():
    while True:
        """ Main entry point of the app """
        config = configparser.ConfigParser()
        config.read('config.ini')
        sign_key=config['DEFAULT']['Signkey']
        source_addr = config['DEFAULT']['SourceAddress']
        account_name = config['DEFAULT']['StorageAccountName']
        account_key = config['DEFAULT']['StorageAccountKey']
        blockchain_type = int(config['DEFAULT']['BlockChainType'])
        infura_api = config['DEFAULT']['InfuraAPI']   #1 for main, 4 for rinkeby
        loop_time = int(config['DEFAULT']['LoopTimeMin'])
        #Sanity checks
        if not sign_key:
            print("Missing sign_key from config file, exiting")
            return
        if not source_addr:
            print("Missing source_addr from config file, exiting")
            return
        if not account_name:
            print("Missing stroage account name, existing")
            return
        if not account_key:
            print("Missing stroage account key, existing")
            return
        if not blockchain_type:
            print("Missing blockchain type, existing")
            return
        if not infura_api:
            print("Missing infura api, existing")
            return
        
        ## Initialize azure storage context 
        table_service = TableService(account_name, account_key)
        block_blob_service = BlockBlobService(account_name, account_key)

        """ Read table entries and prepare the hash of hashes"""
        entries = table_service.query_entities(table_name,filter="BatchId eq 'Q'")
        now = datetime.now(timezone.utc)
        nowStr = now.strftime("%Y%m%d %H:%M:%S")+"Z"
        print (nowStr," Files to process=",len(list(entries)))
        # for task in entries:
        #     print(task.PartitionKey + ","+task.RowKey+","+task.BatchId )
        if ( len(list(entries))>0):    
            #file_digest will be used as our batchId from now on
            digests = create_hash(entries)
            file_digest = digests[0]
            file_digest256 = digests[1]
            print ("File digest=",file_digest)
            #we are also using the file_digest/batchId as the address we'll send a small fraction of ETH as the 
            #PROOF that will reside on the blockchain

            #Prepare the transaction.
            #my_provider = Web3.HTTPProvider("https://rinkeby.infura.io/")
            #my_provider = Web3.HTTPProvider("https://mainnet.infura.io/v3/d00cfc1d87e344a48ab598180a1adcb2")
            my_provider = Web3.HTTPProvider(infura_api)
            w3 = Web3(my_provider)

            
            print("is connected=",w3.isConnected())
            
            try:
                signed_txn = w3.eth.account.signTransaction(dict(
                    nonce=w3.eth.getTransactionCount(
                        source_addr),
                    gasPrice=w3.eth.gasPrice,
                    gas=100000,
                    to=w3.toChecksumAddress("0x" + file_digest),
                    chainId=1, #1 main, 4 for rinkeby
                    data=digests[1],
                    value=w3.toWei(0.00001, 'ether')),
                    sign_key)
                eth_tx_result=w3.eth.sendRawTransaction(signed_txn.rawTransaction)
                tx_url = binascii.b2a_hex(eth_tx_result)
                tx_url = tx_url.decode("utf-8")
                tx_url = "https://rinkeby.etherscan.io/tx/0x" + tx_url
                print("Success \n" + tx_url)
                
                #Now that the transaction has been entered successfully to the blockchain, we can 
                #update entries status and upload the 
                update_entries(entries, file_digest, file_digest256,table_service)
                upload_batch_file(file_digest,block_blob_service)
            except:
                e = sys.exc_info()[0]
                print("There was an issue trying to send the transaction....." + str(e))
        time.sleep(60*loop_time) #time in minutes and sleep asks for seconds
    

    

def update_entries(entries,digest1,digest256,table_service):
    #First, update the transactions table. 
    size = 0
    items = 0
    for entry in entries:
        #print(entry.PartitionKey + ","+entry.RowKey+","+entry.BatchId)
        # task = {'PartitionKey': entry.PartitionKey,
        #         'RowKey': entry.RowKey, 'BatchId': digest1, 'Size': entry.Size}
        task = {'PartitionKey': entry.PartitionKey,
                'RowKey': entry.RowKey, 'BatchId': digest1, 'Size': entry.Size}
        size += entry.Size
        items+=1
        table_service.update_entity(table_name, task)

    #Second, we'll enter one line per batch which will associate between the batchId/fileHash and the blockchain transaction Id. This will also hold the number of 
    batchs_entity = {'PartitionKey': 'Batches', 'RowKey': digest256,'Address':digest1,'Count':items,'Size':size}
    table_service.insert_entity(batches_tble_name,batchs_entity)
    
#The following function creates both the SHA1 and SHA256. SHA1 will be used to create the TX address and we use SHA256 
#as another security measure since SHA1 is lame. the SHA256 is also written as the TX data input and as the identifier
#in the batches table. 
def create_hash(entries):
    digests = []
    now = datetime.now(timezone.utc)
    doc = now.strftime("%Y%m%d %H:%M:%S")+"Z\n"
    for entry in entries:
        # print(entry.PartitionKey + ","+entry.RowKey+","+entry.BatchId)
        line = entry.RowKey +"\n"
        doc = doc + line
    # print(doc)
    with open('output.txt', 'wb') as f:
        f.write(doc.encode())
    with open('output.txt', 'rb') as f:
        fileDigest1 = hashlib.sha1(f.read()).hexdigest()
        
    with open('output.txt', 'rb') as f:
        fileDigest256 = hashlib.sha256(f.read()).hexdigest()

    digests = [fileDigest1,fileDigest256]
    return digests

#Upload the hashes file to the blob storage, using the batchId as the file name
def upload_batch_file(batchId,block_blob_service):
    try:
        fileName = batchId + ".txt"
        block_blob_service.create_blob_from_path(
        container_name,fileName, "output.txt")
        print("Successfully uploaded hashes file to " + fileName)
    except:
        e = sys.exc_info()[0]
        print("There was an issue loading the file " + fileName + "\n" + str(e))




if __name__ == "__main__":
    """ This is executed when run from the command line """
    main()
