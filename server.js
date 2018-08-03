const http = require('http');
const constantes = require('../library/constantes');
const application = require('./application');
const port = process.env.PORT || 8080;
const server = http.createServer(application);
server.listen(port, function () {
  var host = constantes.getServerIpAddress();
  var port = server.address().port
  console.log("APIUSER listening at http://%s:%s", host, port)
});
console.log('RESTful API server started on: ' + port);
