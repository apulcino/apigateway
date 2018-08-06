//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
const constantes = require('../library/constantes');
const multicastRecver = require('../library/multicastRecver');
const http = require('http');
const express = require('express');
const router = express.Router();

let AFORegisteryUrl = [];

//------------------------------------------------------------------------------
// http://localhost:8080/afpforum
//------------------------------------------------------------------------------
router.use((req, res, next) => {
    let Srv = reRouteAPICall(req);
    if (Srv) {
        reSendRequest(req, res, Srv);
    } else {
        res.status(400).json({
            isSuccess: false,
            message: 'api not available'
        });
    }
})

//------------------------------------------------------------------------------
// Vérifier si l'API invoquée est connue
//------------------------------------------------------------------------------
reRouteAPICall = function (req) {
    console.log('reRouteAPICall : ', req.url)
    // Srv : {"type":"3","url":"http://158.50.163.7:3000","pathname":"/api/user","status":true,"cptr":331}
    return constantes.findActiveMService(MServiceList, req.url);
}
//------------------------------------------------------------------------------
// forwarder la requête vers le serveur qui l'héberge
//------------------------------------------------------------------------------
reSendRequest = function (request, response, Srv) {
    var proxy = http.createClient(Srv.port, Srv.host)
    var proxy_request = proxy.request(request.method, request.url, request.headers);
    proxy_request.addListener('response', function (proxy_response) {
        proxy_response.addListener('data', function (chunk) {
            response.write(chunk, 'binary');
        });
        proxy_response.addListener('end', function () {
            response.end();
        });
        response.writeHead(proxy_response.statusCode, proxy_response.headers);
    });
    request.addListener('data', function (chunk) {
        proxy_request.write(chunk, 'binary');
    });
    request.addListener('end', function () {
        proxy_request.end();
    });
}

//------------------------------------------------------------------------------
// Demander à la Registry la liste des services disponibles
//------------------------------------------------------------------------------
let MServiceList = [];
constantes.getServiceList().then(data => { MServiceList = data; });
const intervalObj = setInterval(() => {
    if (0 !== AFORegisteryUrl) {
        constantes.getServiceList(AFORegisteryUrl).then(data => {
            MServiceList = data;
        });
    }
}, 10000);

//------------------------------------------------------------------------------
// Se mettre à l'écoute des messages internes
//------------------------------------------------------------------------------
const mcRecver = new multicastRecver(constantes.getServerIpAddress(), constantes.MCastAppPort, constantes.MCastAppAddr, (address, port, message) => {
    console.log('APIGateway : MCast Msg: From: ' + address + ':' + port + ' - ' + JSON.stringify(message));
    var regUrl = 'http://' + message.host + ':' + message.port;
    if (-1 === AFORegisteryUrl.indexOf(regUrl)) {
        AFORegisteryUrl.push(regUrl);
    }
});

module.exports = router;