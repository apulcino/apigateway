"use strict"
//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
const config = require('config');
const constantes = require('../library/constantes');
const express = require('express');
const router = express.Router();
const consulMgr = require('../library/consulMgr').consulMgr;

//------------------------------------------------------------------------------
// http://localhost:8080/api-docs
// Utiliser l'url : http://127.0.0.1:8500/v1/agent/services
//------------------------------------------------------------------------------
router.get('/', (req, res) => {
    consulMgr.GetAllServices(
        (err) => {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.write(err);
            res.end();
        },
        (services) => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.write(generateHTMLDocument(services));
            res.end();
        });
})

/**
 * ------------------------------------------------------------------------------
 * Générer une vue HTML avec les liens SWAGGER
 *
 * @param {Object[]} newList - Liste des composants disponibles [{"Address":"", "'Port":"", "url":""}].
 * @returns {string} Page html contenant la liste des liens SWAGGER
 * ------------------------------------------------------------------------------
 */
const generateHTMLDocument = function (newList) {
    newList = newList || [];
    let viewArr = [
        '<!DOCTYPE html>',
        '<html>',
        '<head>',
        '<title>Swagger links</title>',
        '</head>',
        '<body>',
        generateHTMLView(newList),
        '</body>',
        '</html>'
    ];
    return viewArr.join('');
}
/**
 * ------------------------------------------------------------------------------
 * Générer une vue HTML avec les liens SWAGGER
 *
 * @param {Object[]} newList - Liste des composants disponibles.
 * @returns {string} Page html contenant la liste des liens SWAGGER
 * ------------------------------------------------------------------------------
 */
const generateHTMLView = function (newList) {
    newList = newList || [];
    let viewArr = [];
    viewArr.push('<table id="linksTable">');
    newList.forEach((value, index, array) => {
        viewArr.push("<tr>");
        viewArr.push('<td>' + value.name + ' : </td>');
        viewArr.push('<td><a href="' + value.url + '/api-docs' + '">API description</a></td>');
        viewArr.push('<td>' + value.url + '/api-docs' + '</td>');
        viewArr.push("</tr>");
    });
    viewArr.push('</table>');
    return viewArr.join('');
}

module.exports = router;