/**
 * Created with JetBrains PhpStorm.
 * User: benlinhuo
 * Date: 14-8-20
 * Time: 上午8:01
 * To change this template use File | Settings | File Templates.
 */

var http = require('http');
var server = http.createServer(function(req, res) {
    if (req.method === 'GET') {
        switch(req.url) {
            case '/':
            case '/index/hmtl':
                var html = '<html><head><meta charset="utf-8" /><title>捷训网</title></head><body>'+
                '<h1>欢迎来到捷训网</h1>'
                '<a href = "/add.html">Add</a>' +
                '<a href = "/remove.html">Remove</a>' +
                '<a href = "/find.html">Find</a>' +
                '<a href = "/edit.html">Edit</a>' +
                '</body></html>';

                res.setHeader('Content-Type', 'text/html');
                res.setHeader('Content-Encoding', 'utf8');
                res.end(html);

                break;

            case '/add.html':
                break;

            case "remove.html":
                break;

            case 'find.html':
                break;

            case 'edit.html':
                break;

            default:
                console.log('Invalid request' + req.url);
        }
    }
});

server.listen(7798);