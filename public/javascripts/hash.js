
function onFileSelect(){
  var reader = new FileReader();
  reader.addEventListener('load',function () {
    var hash = CryptoJS.SHA256(CryptoJS.enc.Latin1.parse(this.result));
    var SHA256 = hash.toString(CryptoJS.enc.Hex)
    var filename = document.getElementById("input").value.split('/').pop().split('\\').pop();
    var output = "SHA256 (" + filename + ") = " +SHA256 
    console.log(output);
    document.getElementById("md5").innerText = output
  });
  reader.readAsBinaryString(document.getElementById("input").files[0]);
}

