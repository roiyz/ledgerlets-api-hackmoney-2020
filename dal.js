var azure = require('azure');
var azureT = require('azure-table-node');
var guid = require('uuid');
const config = require('config');
//export NODE_ENV=prod
const dbConfig = config.get('Conn');
console.log(dbConfig);
var tableService = azure.createTableService(dbConfig);
var tableName = 'BCProof';
var batchesTableName = 'Batches';

//var tableClient = azure.createTableService(ServiceClient.DEVSTORE_STORAGE_ACCOUNT, ServiceClient.DEVSTORE_STORAGE_ACCESS_KEY, ServiceClient.DEVSTORE_TABLE_HOST);

//The following functions goes over the files table and sums up all sizes of files submitted since day0
//TODO: 
//1) Use the batches table for better optimization
//2) Add a date value to not run costly queries
exports.getTotalSizeOfProofedFilesinKB = function(callback){
		//console.log("Calculating size");
		var query = new azure.TableQuery();
		var returnVal="Default";
		tableService.queryEntities(tableName,query, null, function(error, result, response) {
		if(!error)
		{
			let sum=1; 
			sum--;
			for(var i=0; i<result.entries.length;i++)
			{
				var size = result.entries[i].Size['_'].toString();
				sum+=parseInt(size);
			}
			sum=((sum/1024)/1024);
			callback(null,sum.toFixed(1).toString()+"GB");
		}
		else
		{
			console.log("Errors trying to get size of all proofed files\n" + error )
		}
		});
};

//TODO:This requires a pagination as it will most likely cross the 1000 entries mark after ~150 days assuming processing 6 times a day
exports.getNumberOfProofedFiles = function (callback) {
	var returnVal="Default";
	var query = new azure.TableQuery();

	tableService.queryEntities(batchesTableName,query,null,function(error,result)
	{
		if(!error)
		{
			countProofedFile=0;
			for(var i=0; i<result.entries.length;i++)
			{
				batchFilesCount=parseInt(result.entries[i].Count['_']);
				countProofedFile += batchFilesCount;
			}

			callback(null,countProofedFile.toString());
		}
	});
	return;
};

//Returns the number of files pending to be processed
exports.getPendingQueueSize = function (callback) {
	//console.log("Calculating Number of Pending Files");
	var query = new azure.TableQuery().where('BatchId eq ?', 'Q'); //F is for finished
	tableService.queryEntities(tableName,query,null,function(error,result)
	{
		if(!error)
		{
			callback(null, result.entries.length.toString());
		}
	});
};



////////////// ADD NEW ADDRESS
exports.addAddress = function (address,size) {
	var guid1=guid();
	var kbSize = parseInt(size/1024);
	console.log(address + " " + kbSize);
	tableService.createTableIfNotExists(tableName, function(error, result, response) {
		if (!error) {
			console.log("Error trying to create the table");
		  // result contains true if created; false if already exists
		}
	  });
	var entGen = azure.TableUtilities.entityGenerator;
	var entity = {
		PartitionKey: entGen.String('BCProof'),
		RowKey: entGen.String(address),
		Size: entGen.Int64(kbSize),
		//Address: entGen.String(address),
		BatchId: entGen.String("Q"),
		};
	tableService.insertEntity(tableName, entity, function(error, result, response) {
		if (!error) {
			console.log("success inserting address"); // result contains the ETag for the new entity
		}
		else
		{
			console.log(error);
			if (error.code === 'EntityAlreadyExists')
				console.log("item already exists");
			return -1; //-1 is already exist for now. 
		}
		});
	return guid1;
};




///Returns all enteties with the proper requestId (should be only 1)
exports.getStatus = function (requestId,callback) {
	var returnVal="Default";
	var query = new azure.TableQuery().where('BatchId eq ?', '');
	tableService.queryEntities(tableName,query,null,function(error,result)
	{
		if(!error)
		{
			//var ent1 = result.entries;
			//console.log(ent1.Status);
			callback(null,result.entries.length);
		}
	});
	
}

///Returns all enteties with the proper requestId (should be only 1)
exports.getSubmittedFileStatus = function (requestId,callback) {
	var returnVal="Default";
	var query = new azure.TableQuery().where('RowKey eq ?', requestId);
	tableService.queryEntities(tableName,query,null,function(error,result)
	{
		if(!error)
		{
			//var ent1 = result.entries;
			//console.log(ent1.Status);
			if(result.entries.length>0)
			{
				callback(null,result.entries[0].BatchId["_"].toString());
			}
			else
			{
				callback(null,"NA");
			}
			
		}
	});
	
}

exports.getStorUrl = function()
{
	//https://ledgerletsstorprod.blob.core.windows.net/batches/88b4b715a2250fe5e444f1e18b10173780a5edf8.txt
	
	const fileStoreStr = config.get('FilesStore');
	var urlPrefix = "https://"+fileStoreStr+".blob.core.windows.net/batches/";
	return urlPrefix;
}

exports.Setup = function()
{
	tableService.createTableIfNotExists(tableName, function(error, result, response) {
		if (!error) {
			console.log("Error trying to create the table");
		}
	  });

	tableService.createTableIfNotExists(batchesTableName, function(error, result, response) {
	if (!error) {
		console.log("Error trying to create the table");
	}
	});
	   


}
