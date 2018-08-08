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
    // destCompo : {"type":"3","url":"http://158.50.163.7:3000","pathname":"/api/user","status":true,"cptr":331}
    var destCompo = constantes.findActiveMService(MServiceList, req.url);
    console.log('APIGateway : Route API call to : ', destCompo.url);
    return destCompo
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
            Srv.cptr += 1;
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
    // Demander la liste des annuaires connus
    let AFORegisteryUrlList = regMgr.getList();
    if (0 !== AFORegisteryUrlList.length) {
        // Demander au 1er annuaire de la liste
        constantes.getServiceList('APIGateway', AFORegisteryUrlList[0]).then(data => {
            // Réception de la nouvelle liste de composants
            SynchronizeComponentsList(data);
        }).catch((AFORegisteryUrlWithError) => {
            // Indiquer que cet annuaire n'est pas fiable...
            regMgr.error(AFORegisteryUrlWithError);
        });
    }
}
//------------------------------------------------------------------------------
// Demander à la Registry la liste des services disponibles maintenant puis toutes
// les 10 secondes
//------------------------------------------------------------------------------
findAvailableServices();
const intervalObj = setInterval(() => {
    findAvailableServices();
}, 10000);

//------------------------------------------------------------------------------
// Synchroniser la nelle liste de composants (newList) avec la courante MServiceList
// newList = [
//     {"type":"1","url":"http://158.50.163.7:59095","host":"158.50.163.7","port":"59095","pathname":"/api/events","status":true,"cptr":861},
//     {"type":"1","url":"http://158.50.163.7:63715","host":"158.50.163.7","port":"63715","pathname":"/api/events","status":true,"cptr":385}
// ]
//------------------------------------------------------------------------------
SynchronizeComponentsList = function (newList) {
    newList = newList || [];
    MServiceList = MServiceList || [];
    if (MServiceList.length === 0) {
        for (let i = 0; i < newList.length; i++) {
            newList[i].cptr = 0;
        }
        MServiceList = newList;
        return;
    }
    //------------------------------------------------------------------------------
    // Ajouter les nouveaux composants
    //------------------------------------------------------------------------------
    for (let i = 0; i < newList.length; i++) {
        var found = MServiceList.find(function (element) {
            return (element.url === newList[i].url);
        });
        // C'est un nouveau, on l'ajoute à la liste
        if (!found) {
            newList[i].cptr = 0;
            MServiceList.push(newList[i]);
        }
    }
    //------------------------------------------------------------------------------
    // Marquer les composants qui ont disparus (url <- '')
    //------------------------------------------------------------------------------
    for (let j = 0; j < MServiceList.length; j++) {
        var found = newList.find(function (element) {
            return (element.url === MServiceList[j].url);
        });
        // Le composant n'est plus disponbible
        if (!found) {
            // Marquer le composant pour le supprimer
            MServiceList[j].url = '';
        }
    }
    //------------------------------------------------------------------------------
    // Supprimer les composants marqués
    //------------------------------------------------------------------------------
    MServiceList = MServiceList.filter(Srv => Srv.url.length !== 0);
    return MServiceList;
}

//------------------------------------------------------------------------------
// Se mettre à l'écoute des messages internes
//------------------------------------------------------------------------------
const mcRecver = new multicastRecver(constantes.getServerIpAddress(), constantes.MCastAppPort, constantes.MCastAppAddr, (address, port, message) => {
    console.log('APIGateway : Recv Msg From : ' + address + ':' + port + ' - ' + JSON.stringify(message));
    if (message.type === constantes.MSMessageTypeEnum.regAnnonce) {
        regMgr.add(message.host, message.port);
    }
});


module.exports = router;