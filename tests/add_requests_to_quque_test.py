#!/usr/bin/env python3
"""
Module Docstring
This script enters a set of random entries to the requests table
"""

__author__ = "Roiy Zysman"
__version__ = "0.1.0"
__license__ = "MIT"

import configparser
from azure.storage.table import TableService
import os, uuid, sys
import random
import hashlib

account_name = os.getenv("AZURE_STORAGE_ACCOUNT")
account_key = os.getenv("AZURE_STORAGE_ACCESS_KEY")
table_name = "BCProof"
table_service = TableService(account_name, account_key)

def main():
    """ Main entry point of the app """
    config = configparser.ConfigParser()
    config.read('../config.ini')
    for x in range(10):
        mocked_address=(hashlib.sha256(str(random.randint(1,10000000000)).encode()).hexdigest())
        task = {'PartitionKey': 'BCProof', 'RowKey': mocked_address, 'BatchId':'Q', 'Size':'10000'}
        table_service.insert_entity(table_name, task)
        #print (hashlib.sha1(b'test').hexdigest())




if __name__ == "__main__":
    """ This is executed when run from the command line """
    main()
