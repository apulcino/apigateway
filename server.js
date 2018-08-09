const http = require('http');
const constantes = require('../library/constantes');
const traceMgr = new (require('../library/tracemgr'))('APIGateway');
const application = require('./application');
const port = process.env.PORT || 8080;
const server = http.createServer(application);
server.listen(port, function () {
  var host = constantes.getServerIpAddress();
  var port = server.address().port
  traceMgr.info("listening at http://%s:%s", host, port)
});
traceMgr.info('RESTful API server started on: ' + port);


