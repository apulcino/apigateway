"use strict"
//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
const constantes = require('../library/constantes');
const traceMgr = new (require('../library/tracemgr'))('APIGateway');
//const multicastRecver = require('../library/multicastRecver');
const regsitryMgr = require('../library/registryMgr');
const consulMgr = require('../library/consulMgr').consulMgr;

const http = require('http');
const express = require('express');
const router = express.Router();
const forward = require('http-forward');
const regMgr = new regsitryMgr(traceMgr);
let date = (new Date()).getTime();

//------------------------------------------------------------------------------
// Authentication
//------------------------------------------------------------------------------
router.use((req, res, next) => {
    // TODO: my authentication logic
    traceMgr.debug('Check authentification...');
    next()
})
//------------------------------------------------------------------------------
// Traitement des demandes vers AFPForum...
//------------------------------------------------------------------------------
// http://localhost:8080/afpforum/...
// result : {
//     "address":"158.50.163.7",
//     "id":"authent-v1_51102",
//     "name":"authent-v1",
//     "port":51102,
//     "realUrl":"api/v1/user/login",
//     "url":"http://158.50.163.7:51102"
// }
//------------------------------------------------------------------------------
router.use((req, res, next) => {
    // Rechercher le composant qui peut répondre à la demande
    console.log('req.url : ' + req.headers.host);
    consulMgr.Resolve(traceMgr, req.headers.host, req.url,
        (err) => {
            traceMgr.error('Error : ', err);
            // Aucun composant ne sait traiter cette demande
            res.set('XAFP-SOURCE', 'Service_Unavailable');
            res.status(400).json({
                isSuccess: false,
                message: 'api not available'
            });
        },
        (SrvArray) => {
            routeCallToService(SrvArray, req, res, next);
        });
})
//------------------------------------------------------------------------------
// http://localhost:8080/afpforum/...
//------------------------------------------------------------------------------
function routeCallToService(SrvArray, req, res, next) {
    try {
        date += 1;
        // Rechercher le composant qui peut répondre à la demande
        if (SrvArray.length != 0) {
            // Ajouter les headers
            var TRANSID = 'XAFP_' + date;
            // Proxification de la dermande
            reSendRequest(req, res, SrvArray, TRANSID,
                null,
                (err) => {
                    // Le composant visé ne répond pas...
                    res.set('XAFP-SOURCE', 'Service_Unavailable');
                    res.status(500).json({
                        isSuccess: false,
                        message: err.message
                    });
                    // removeComponentFromList(Srv);
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
}
//------------------------------------------------------------------------------
// forwarder la requête vers le serveur qui héberge le composant
// Srv : {
//     "address":"158.50.163.7",
//     "id":"authent-v1_51102",
//     "name":"authent-v1",
//     "port":51102,
//     "realUrl":"http://158.50.163.7:51102/api/v1/user/login",
//     "url":"http://158.50.163.7:51102"
// }
//------------------------------------------------------------------------------
const reSendRequest = function (req, res, SrvArray, TRANSID, successCB, errorCB) {
    successCB = successCB || function () { };
    errorCB = errorCB || function () { };
    res.set('XAFP-TRANSID', TRANSID);
    res.set('XAFP-SOURCE', req.url);
    req.headers['XAFP-TRANSID'] = TRANSID;
    req.headers['content-type'] = "application/json"

    // Il faut implementer le pattern circuit breaker...
    let Srv = SrvArray[Math.floor(Math.random() * SrvArray.length)];
    traceMgr.info('Route API call to : ' + Srv.realUrl);
    req.url = Srv.realUrl;
    req.forward = { target: Srv.url }
    forward(req, res, (err, res) => {
        if (err) {
            traceMgr.error('Error forwarding Msg to : ', req.url);
        } else {
            traceMgr.debug('Forwarded Msg to : ', req.url);
            return;
        }
    });
}

//------------------------------------------------------------------------------
// Se mettre à l'écoute des messages internes
//------------------------------------------------------------------------------
// const mcRecver = new multicastRecver(constantes.getServerIpAddress(), constantes.MCastAppPort, constantes.MCastAppAddr, constantes.getServerPublicIpAddress(), (address, port, message) => {
//     switch (message.type) {
//         // Annonce d'une registry présente sur le réseau
//         case constantes.MSMessageTypeEnum.regAnnonce:
//             traceMgr.info('Recv Msg : regAnnonce : ', JSON.stringify(message));
//             regMgr.add(message.host, message.port);
//             if (MServiceList.length === 0) {
//                 findAvailableServices();
//             }
//             break;
//         // Annonce d'une mise à jour de registry
//         case constantes.MSMessageTypeEnum.regUpdate:
//             traceMgr.info('Recv Msg : regUpdate');
//             findAvailableServices();
//             break;
//         default:
//             //traceMgr.debug('Recv Msg From : ' + address + ':' + port + ' - ' + JSON.stringify(message));
//             break;
//     }
// });

module.exports = router;
