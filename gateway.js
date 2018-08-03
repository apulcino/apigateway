//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
const constantes = require('../library/constantes');
var http = require('http');
const express = require('express');
const router = express.Router();

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
//------------------------------------------------------------------------------
reRouteAPICall = function (req) {
    console.log('reRouteAPICall : ', req.url)
    // Srv : {"type":"3","url":"http://158.50.163.7:3000","pathname":"/api/user","status":true,"cptr":331}
    return constantes.findActiveMService(MServiceList, req.url);
}
//------------------------------------------------------------------------------
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
//------------------------------------------------------------------------------
let MServiceList = [];
constantes.getServiceList().then(data => { MServiceList = data; });
const intervalObj = setInterval(() => {
    constantes.getServiceList().then(data => {
        MServiceList = data;
    });
}, 10000);

module.exports = router;