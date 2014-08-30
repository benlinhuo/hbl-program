/**
 * Created with JetBrains PhpStorm.
 * User: benlinhuo
 * Date: 14-8-22
 * Time: 下午10:05
 * To change this template use File | Settings | File Templates.
 */

var http = require('http');
var fs = require('fs');

http.createServer(function(req, res){
    if (req.method === 'GET') {
        switch (req.url) {
            case '/Index.html':
                fs.readFile("./html/index.html", function(err, data) {
                    if (err) throw err;
                    res.writeHeader(200, {'Content-Tpe': 'text/html'});
                    res.write(data.toString());
                    res.end();
                });
                break;
        }

    } else {
        console.log('Not Supported!');
    }


}).listen(7798);