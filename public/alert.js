var ipc = require('electron').ipcRenderer;

window.alert = function() {
	console.log("alert"); 
	ipc.send("keyboard", {}); 
}