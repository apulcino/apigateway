"use strict"
//------------------------------------------------------------------------------
// 4.7.1. API de supervision
// Il doit exposer en interne de la plate-forme les API REST suivantes :
// /admin/v1/status : statut simple, renvoyant un statut de fonctionnement incluant des informations techniques sur l’état actuel du composant. Un exemple d’utilisation typique est l’intégration à un outil de supervision ou à un élément actif tiers (ex: load-balancer, ...) . L’appel doit être peu coûteux.
// /admin/v1/autotest : autotest du composant, lançant un test de présence des différentes resources requises par le composant et renvoyant un statut d’état de ces resources.
// /admin/v1/version : statut renvoyant les informations relatives à la version.
//------------------------------------------------------------------------------
const constantes = require('../library/constantes');
const express = require('express');
const router = express.Router();

//------------------------------------------------------------------------------
// http://localhost:8080/health/status
//------------------------------------------------------------------------------
router.get('/status', (req, res) => {
    // console.log("call for health/status")
    res.status(200).json({
        isSuccess: true
    });
})

module.exports = router;