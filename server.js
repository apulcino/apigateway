const config = require('config');
const http = require('http');
const constantes = require('../library/constantes');
const traceMgr = new (require('../library/tracemgr'))('APIGateway');
const application = require('./application');
const consulMgr = require('../library/consulMgr').consulMgr;
const server = http.createServer(application);

// Configuration utilisée...
if (config.has('title')) {
  traceMgr.info("using configuration file : %s", config.get('title'));
}
// Port d'écoute
let port = 8080;
if (config.has('Components.AFOAuthent.port')) {
  port = config.get('Components.APIGateway.port');
  traceMgr.info('Server starting on: ' + port);
}
// Création du serveur HTTP
server.listen(port, function () {
  var host = constantes.getServerIpAddress();
  var port = server.address().port
  traceMgr.info("listening at http://%s:%s", host, port)

  // Avertir consul de notre existance
  consulMgr.Register({
    "Name": "APIGateway",
    "Tags": ["apigateway"],
    "Address": host,
    "Port": port
  });
});
traceMgr.info('Server started on: ' + port);


