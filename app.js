var express = require('express');
var app = express();
var path = require('path');
var formidable = require('formidable');
const https = require("https");
var fs = require('fs');
var dal = require('./dal.js');
const config = require('config');
const bodyParser = require('body-parser');


// const options = {
//   key: fs.readFileSync("keys/privkey.pem"),
//   cert: fs.readFileSync("keys/chain.pem")
// };

//var tasksTracker = require('./helpers/tasks-tracking.js');
//var blobHelper = require('./helpers/blob-helper.js');
var guid = require('uuid');
const PORT = config.get('Port');
const PORTSSL = config.get('PortSSL');
//const PORT = 80;
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));


app.get('/', function (req, res) {
  //dal.Setup();
  res.sendFile(path.join(__dirname, 'views/main.html'));
});

app.get('/ID/:requestedId', function (req, res) {
  var requestedId = req.params['requestedId'];
  let size = req.query.size;
  
  console.log(requestedId);
  result = dal.addAddress(requestedId, size);
  res.sendFile(path.join(__dirname, 'views/main.html'));
});

app.post('/API/file/:HashID',function (req,res) {
 /*  let size = req.query.size;
  let hash = req.query.hash;
  console.log("file hash put " + hash +" " + size); */
  var hashId = req.params['HashID'];
  console.log(hashId);
  if((hashId.length!=64) || (!hashId.match(/^[0-9a-zA-Z]+$/)) ) 
  {
    return res.status(400).send({
      message: 'HashId is not in the right format. Should be a SHA256 output'});
  }
  result = dal.addAddress(hashId, 0);
  var response =[];
  var fileObj ={staus:"submitted"} ;
  //console.log(req.body);
  res.end(JSON.stringify(fileObj));
});

app.get('/API/file/:HashID',function (req,res) {
  /*  let size = req.query.size;
   let hash = req.query.hash;
   console.log("file hash put " + hash +" " + size); */
   var hashId = req.params['HashID'];
   console.log(hashId);
   if((hashId.length!=64) || (!hashId.match(/^[0-9a-zA-Z]+$/)) ) 
  {
    return res.status(400).send({
      message: 'HashId is not in the right format. Should be a SHA256 output'});
  }
   dal.getSubmittedFileStatus(hashId,function (err,data)
   {
     var fileObj=[];
     if(data=="Q")
      fileObj = {staus:"queued"};
     else if(data=="NA")
     fileObj = {staus:"NA"};
    else //Assuming we recieved a batch ID
    {
      var storeUrl=dal.getStorUrl()+data+".txt";
      fileObj = {status:"submitted",batchId:data,downloadProofFileUrl:storeUrl}
    }
    
    res.end(JSON.stringify(fileObj));
   });
   /* var fileObj ={staus:"submitted"} ;
   //console.log(req.body);
   res.end(JSON.stringify(fileObj)); */
 });

// TEST FUNC
// app.get('/IDA/:requestedId', function (req, res) {
//   var requestedId = req.params['requestedId'];
//   let size = req.query.size;
//   console.log(requestedId);
//   dal.getStatus(requestedId,function (err, returnValue)
//   {
//     res.end(returnValue.toString());
//   });
  
//   // if (result === -1)
//   //   res.end("This file was already submitted");  
//   // else
//   //   res.end(requestedId);
    

// });

app.get('/Files/TotalSize', function (req, res) {
  dal.getTotalSizeOfProofedFilesinKB(function (err, returnValue)
  {
    res.end(returnValue.toString());
  });
});


///Status for a pending submission
app.get('/Files/Status/:requestedId', function (req, res) {
  var requestedId = req.params['requestedId'];

  dal.getSubmittedFileStatus(requestedId,function (err,data)
  {
    res.end(data);
  });
});

app.get('/Files/QueueSize', function (req, res) {
  result = dal.getPendingQueueSize();
  res.end(result);
});

app.get('/Files/ProofedFiles', function (req, res) {
  dal.getNumberOfProofedFiles(function (err, returnValue)
  {
    res.end(returnValue.toString());
  });
});

app.get('/Files/PendingFiles', function (req, res) {
  dal.getPendingQueueSize(function (err, returnValue) {
    res.end(returnValue.toString());
  });
});



// Redirect from http port 80 to https
var http = require('http');
http.createServer(function (req, res) {
    res.writeHead(301, { "Location": "https://" + req.headers['host'] + req.url });
    res.end();
}).listen(PORT);

https.createServer({
  key: fs.readFileSync('keys/privkey.pem'),
  cert: fs.readFileSync('keys/cert.pem'),
  ca: fs.readFileSync('keys/chain.pem')
}, app).listen(PORTSSL, () => {
  
  console.log('Listening on port:' + PORT + "," + PORTSSL + " FileStore:" + config.get('FilesStore'));
});
 




// var server = app.listen(PORT, function () {
//   console.log('Server listening on port ' + PORT);
// });

