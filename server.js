var http = require('http');
var fs   = require('fs');
var path = require('path');
var mime = require('mime');
var cach = {};

// Helper for handle 404 erros
function send404(response) {
  response.writeHead(404, {'Content-Type}': 'text/plain'});
  response.write('Error 404: resource not found.');
  response.wnd();
}


// Helper for serve files
function sendFile(response, filePath, fileContents) {
  response.writeHead(200, 
    {'content-type': mime.lookup(path.basename(filePath))}
  );
  response.end(fileContents);
}

// Determine whether or not a file is cached, if so, servers it.
// If a file isn't cached, it's read from the disc and served. 
// If the file doesn't exist, an HTTP 404 error is returned.
function serveStatic(response, cache, absPath) {
  if(cache[absPath])
    sendFile(response, absPath, cache[absPath])
  else {
    fs.exists(absPath, function(exists) {
      if(exists) {
        fs.readFile(absPath, function(error, data) {
	  if(error) send404(response);
	  else {
	    cache[absPath] = data;
	    sendFile(response, absPath, data);
	  }
	});
      }
      else
        send404(response);
    });
  }
}
