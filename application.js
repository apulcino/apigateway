"strict mode"
const config = require('config');
const express = require('express');
const application = express();
const bodyParser = require("body-parser");
const jsonParser = bodyParser.json();
const constantes = require('../library/constantes');
const apiRegistryRoutes = require('./gateway');

// Gestion de la route vers : http://localhost:8080/api-docs
const apiAPIDocsRoutes = require('./APIDocs');
application.use(constantes.MSPathnameEnum.afoApiDocs, apiAPIDocsRoutes);

// Gestion de la route vers : http://localhost:8080/health/...
const apiHealthRoutes = require('./APIHealth');
application.use(constantes.MSPathnameEnum.afoHealth, apiHealthRoutes);

// Gestion de la route vers : http://localhost:8080/afpforum/...
let rootRoute = '/afpforum';
if (config.has('Components.APIGateway.rootRoute')) {
    rootRoute = config.get('Components.APIGateway.rootRoute');
}
application.use(rootRoute, apiRegistryRoutes);
module.exports = application;