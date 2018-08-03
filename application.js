const express = require('express');
const application = express();

const apiRegistryRoutes = require('./gateway');
application.use('/afpforum', apiRegistryRoutes);
module.exports = application;