function onFileSelect() {
    var reader = new FileReader();
    reader.addEventListener('load', function () {
        var hash = CryptoJS.SHA256(CryptoJS.enc.Latin1.parse(this.result));
        var SHA256 = hash.toString(CryptoJS.enc.Hex)
        var filename = document.getElementById("chooseFile").value.split('/').pop().split('\\').pop();
        var output = "SHA256 (" + filename + ") = " + SHA256
        console.log(output);
        document.getElementById("md5").innerText = output
        window.location.href = "/ID/" + SHA256 + "?size=" + Object.keys(this.result).length;
    });
    reader.addEventListener('progress', function (evt) {
         // if (evt.lengthComputable) {
        //     // calculate the percentage of upload completed
        //     var percentComplete = evt.loaded / evt.total;
        //     percentComplete = parseInt(percentComplete * 100);

        //     // update the Bootstrap progress bar with the new percentage
        //     $('.progress-bar').text(percentComplete + '%');
        //     $('.progress-bar').width(percentComplete + '%');

        //     // once the upload reaches 100%, set the progress bar text to done
        //     if (percentComplete === 100) {
        //         $('.progress-bar').html('Done');
        //     }
        // }

    });
    reader.readAsBinaryString(document.getElementById("chooseFile").files[0]);
}


function UpdateTotalProofFilesSizeTile()
{
    $.get("/Files/TotalSize", function (data) {
        // $(".result").html(data);
        $("#ProofSize").text(data);
        console.log(data);
    });
}

function UpdateToBeProofedQueue() {
    $.get("/Files/QueueSize", function (data) {
        // $(".result").html(data);
        $("#ProofQueue").text(data);
        console.log(data);
    });
}


function UpdateProofedFilesCount() {
    $.get("/Files/ProofedFiles", function (data) {
        // $(".result").html(data);
        $("#ProofedFilesCount").text(data);
        console.log("Proofed Files Count " + data);
    });
}

function UpdatePendingFilesCount() {
    $.get("/Files/PendingFiles", function (data) {
        // $(".result").html(data);
        $("#PendingFilesCount").text(data);
        console.log("Pending Files Count " + data);
    });
}

function CheckSubmittedFileStatus()
{
    ///Get/Parse hash id
    var urlSections = window.location.pathname.toString().split('/');
    if(urlSections.length==3)
    {
        // alert (urlSections[2]);
        $.get("/Files/Status/"+urlSections[2], function (data) {
            // $(".result").html(data);
            $(".file-field").hide();
            $(".status-field").show();
            
            if(data=="Q")
                $("#statusTxt").html("Congrats!!! 🎉🎉🎉<br>Your file's unique signature is <b>queued</b> and about to be entered into the blockchain." + 
                "<br>Keep this page open or save this <a href='" + window.location.href+"'>URL</a> to check the transaction information"+
                "<br><br>Files are usually processed every hour");
            else
            {
                
                var responseText = "👍 Your file's unique signature has been entered into the blockchain!<br>⛓️ Blockchain " + "<a target='_new' href='https://etherscan.io/address/0x" + data +"'>TX record</a>." +
                "<br>🔑 <a href='https://ledgerletsstorprod.blob.core.windows.net/batches/" + data + ".txt'>Proof file</a> <-- Save this as proof with your own file." +
                "<br><br><a href='/'>Proof another file</a>";

                $("#statusTxt").html(responseText);
            }
                
            console.log(data);
        });
    }
    /// Call get status function and fill in the 
}

//Calculates the hours, minutes and seconds remaining for the next batch signing job
function UpdateNextBatchTime()
{
    //NOOP for now
    return;

    //Number of segments of batch updates a day. e.g. 4 segments = every 6 hours, 24 means every hour, etc
    var segments = 24
    
    
    var segmentSeconds = (60*60*24/segments); //divide 24hrs a day and multiply by the number of minutes and seconds 
    
    
    var now = new Date();
    var currentSeconds = (now.getUTCHours()*3600 + now.getUTCMinutes()*60 + now.getUTCSeconds())%segmentSeconds;
    //var currentSeconds = (now.getUTCHours()*3600 + now.getUTCMinutes()*60)%segmentSeconds;
    var utc_now = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),  now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(), now.getUTCMilliseconds());
    var deltaSeconds = segmentSeconds -  currentSeconds;

    
    console.log('UTC: ' + utc_now +" Hours:"+ now.getUTCHours() +" Minutes:"+ now.getUTCMinutes() + " Current Seconds:" + currentSeconds + ' Seconds:'+deltaSeconds) //
    var nextBatchHours = Math.floor(deltaSeconds/3600);
    var nextBatchMinutes = Math.floor(deltaSeconds/60);
    var nextBatchSeconds =Math.floor(deltaSeconds%60)

    var nextBatchTimeStr = "A proof that your document existed will be recoreded on the blockchain in " + nextBatchHours +" hour(s), " + nextBatchMinutes +" minute(s) and "+nextBatchSeconds +" seconds";
    $('#timeToNextBatchLbl').text(nextBatchTimeStr);
    setTimeout(function () {
        UpdateNextBatchTime();
    }, 1000);
}

function UpdateTiles()
{
    UpdateProofedFilesCount();
    UpdateTotalProofFilesSizeTile();
    //UpdateToBeProofedQueue();
    CheckSubmittedFileStatus();
    UpdatePendingFilesCount();
    
    setTimeout(function () {
        UpdateTiles();
    }, 10000);

    $(document).ready(function(){
        UpdateNextBatchTime();
    });
}

