if (typeof module === 'object') {window.module = module; module = undefined;}
window.$ = window.jQuery = require('jquery');
$(window).on("load", function() {
	console.log($('.app-webview').html()); 
	$("[name='email']").val("gittebel@yahoo.com"); 
}); 