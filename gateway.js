"use strict"
//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
const constantes = require('../library/constantes');
const traceMgr = new (require('../library/tracemgr'))('APIGateway');
const multicastRecver = require('../library/multicastRecver');
const regsitryMgr = require('../library/registryMgr');

const http = require('http');
const express = require('express');
const router = express.Router();

const regMgr = new regsitryMgr(traceMgr);
let date = (new Date()).getTime();
// Liste des composant disponible sur le réseau
let MServiceList = [];
//------------------------------------------------------------------------------
// Traitement des demandes vers AFPForum...
//------------------------------------------------------------------------------
// http://localhost:8080/afpforum
//------------------------------------------------------------------------------
router.use((req, res, next) => {
    try {
        date += 1;
        // Rechercher le composant qui peut répondre à la demande
        let Srv = reRouteAPICall(req);
        if (Srv) {
            // Ajouter les headers
            var TRANSID = 'XAFP_' + date;
            res.set('XAFP-TRANSID', TRANSID);
            res.set('XAFP-SOURCE', Srv.url);
            // PRoxification de la dermande
            reSendRequest(req, res, Srv, TRANSID,
                null,
                (err) => {
                    // Le composant visé ne répond pas...
                    res.set('XAFP-SOURCE', 'Service_Unavailable');
                    res.status(500).json({
                        isSuccess: false,
                        message: err.message
                    });
                    removeComponentFromList(Srv);
                });
        } else {
            // Aucun composant ne sait traiter cette demande
            res.set('XAFP-SOURCE', 'Service_Unavailable');
            res.status(400).json({
                isSuccess: false,
                message: 'api not available'
            });
        }
    } catch (err) {
        // Problème lors du traitement de la demande
        res.set('XAFP-SOURCE', 'Service_Unavailable');
        res.status(400).json({
            isSuccess: false,
            message: err.message
        });
    }
})

//------------------------------------------------------------------------------
// Vérifier si l'API invoquée est traité par un composant
//------------------------------------------------------------------------------
const reRouteAPICall = function (req) {
    // destCompo : {"type":"3","url":"http://158.50.163.7:3000","pathname":"/api/user","status":true,"cptr":331}
    var destCompo = constantes.findActiveMService(MServiceList, req.url);
    if (destCompo) {
        traceMgr.info('Route API call to : ', destCompo.url);
    }
    return destCompo;
}
//------------------------------------------------------------------------------
// forwarder la requête vers le serveur qui héberge le composant
//------------------------------------------------------------------------------
const reSendRequest = function (request, response, Srv, TRANSID, successCB, errorCB) {
    successCB = successCB || function () { };
    errorCB = errorCB || function () { };
    var myHeaders = request.headers;
    myHeaders['XAFP-TRANSID'] = TRANSID;
    var proxy = http.createClient(Srv.port, Srv.host)
    proxy.on('error', function (err) {
        // Handle error
        errorCB(err);
    });
    var proxy_request = proxy.request(request.method, request.url, myHeaders);
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
const findAvailableServices = function () {
    // Demander la liste des annuaires connus
    let AFORegisteryUrlList = regMgr.getList();
    if (0 !== AFORegisteryUrlList.length) {
        // returns a random integer from 0 to AFORegisteryUrlList.length - 1
        let idx = Math.floor(Math.random() * AFORegisteryUrlList.length);
        // Demander a l'un des annuaires de la liste des composant disponibles sur le réseau
        constantes.getServiceList(traceMgr, AFORegisteryUrlList[idx]).then(data => {
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
    regMgr.checkRegistryStatus();
}, 30000);

//------------------------------------------------------------------------------
// Supprimer le composant indiqué
//------------------------------------------------------------------------------
const removeComponentFromList = function (Srv) {
    MServiceList = MServiceList || [];
    let idx = MServiceList.findIndex((item) => {
        return (item.url === Srv.url);
    });
    if (-1 !== idx) {
        MServiceList.splice(idx, 1);
    }
    if (0 === MServiceList.length) {
        traceMgr.error('No component available');
    }
}
//------------------------------------------------------------------------------
// Synchroniser la nelle liste de composants (newList) avec la courante MServiceList
// newList = [
//     {"type":"1","url":"http://158.50.163.7:59095","host":"158.50.163.7","port":"59095","pathname":"/api/events","status":true,"cptr":861},
//     {"type":"1","url":"http://158.50.163.7:63715","host":"158.50.163.7","port":"63715","pathname":"/api/events","status":true,"cptr":385}
// ]
//------------------------------------------------------------------------------
const SynchronizeComponentsList = function (newList) {
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
const mcRecver = new multicastRecver(constantes.getServerIpAddress(), constantes.MCastAppPort, constantes.MCastAppAddr, constantes.getServerPublicIpAddress(), (address, port, message) => {
    switch (message.type) {
        // Annonce d'une registry présente sur le réseau
        case constantes.MSMessageTypeEnum.regAnnonce:
            traceMgr.info('Recv Msg : regAnnonce : ', JSON.stringify(message));
            regMgr.add(message.host, message.port);
            if (MServiceList.length === 0) {
                findAvailableServices();
            }
            break;
        // Annonce d'une mise à jour de registry
        case constantes.MSMessageTypeEnum.regUpdate:
            traceMgr.info('Recv Msg : regUpdate');
            findAvailableServices();
            break;
        default:
            traceMgr.debug('Recv Msg From : ' + address + ':' + port + ' - ' + JSON.stringify(message));
            break;
    }
});


module.exports = router;