//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
const constantes = require('../library/constantes');
const multicastRecver = require('../library/multicastRecver');
const regsitryMgr = require('../library/registryMgr');
const http = require('http');
const express = require('express');
const router = express.Router();

let MServiceList = [];
const regMgr = new regsitryMgr();
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
// Faire une Mise à jour de la liste des services
//------------------------------------------------------------------------------
findAvailableServices = function () {
    let AFORegisteryUrlList = regMgr.getList();
    if (0 !== AFORegisteryUrlList.length) {
        constantes.getServiceList(AFORegisteryUrlList[0]).then(data => {
            MServiceList = data;
        }).catch((AFORegisteryUrlWithError) => {
            regMgr.error(AFORegisteryUrlWithError);
        });
    }
}
//------------------------------------------------------------------------------
// Demander à la Registry la liste des services disponibles
//------------------------------------------------------------------------------
findAvailableServices();
const intervalObj = setInterval(() => { findAvailableServices(); }, 10000);
//------------------------------------------------------------------------------
// Se mettre à l'écoute des messages internes
//------------------------------------------------------------------------------
const mcRecver = new multicastRecver(constantes.getServerIpAddress(), constantes.MCastAppPort, constantes.MCastAppAddr, (address, port, message) => {
    console.log('APIGateway : MCast Msg: From: ' + address + ':' + port + ' - ' + JSON.stringify(message));
    if (message.type === constantes.MSMessageTypeEnum.regAnnonce) {
        regMgr.add(message.host, message.port);
    }
});


module.exports = router;