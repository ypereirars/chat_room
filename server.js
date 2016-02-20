var http = require('http');
var fs   = require('fs');
var path = require('path');
var mime = require('mime');
var cache = {};

// Helper for handle 404 erros
function send404(response) {
  response.writeHead(404, {'Content-Type}': 'text/plain'});
  response.write('Error 404: resource not found.');
  response.end();
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

//Creates de http server
var server = http.createServer(function(request, response) {
  var filePath = false;
  if(request.url == '/')
    filePath = 'public/index.html';
  else
    filePath = 'public' + request.url;

  var absPath = './' + filePath;

  serveStatic(response, cache, absPath);
});

//Listen to a port
server.listen(3000, function() {
  console.log("Server listening on port 3000.");
});
