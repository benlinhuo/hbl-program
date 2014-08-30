/**
 * Created with JetBrains PhpStorm.
 * User: benlinhuo
 * Date: 14-8-23
 * Time: 上午8:16
 * To change this template use File | Settings | File Templates.
 */

var http = require('http');
var fs = require('fs');
var qs = require('querystring');
var websites = [];//保存在数组中（内存中，只要node JSWebSiteDynamic.js不终止，数据就一直会存在）

http.createServer(function(req, res) {
    var postData = '';
    if (req.method === 'GET') {
        switch(req.url) {
            case '/Index.html':
                fs.readFile('./html/Index.html', function(err, data) {
                    if (err) throw err;
                    res.writeHeader(200, {'Content-Type': 'text/html'});
                    res.end(data.toString());
                });
                break;

            case '/Add.html':
                fs.readFile('./html/Add.html', function(err, data) {
                    if (err) throw err;
                    res.writeHeader(200, {'Content-Type': 'text/html'});
                    res.end(data.toString());
                });
                break;


        }

    } else if (req.method === 'POST') {
        switch(req.url) {
            case '/Add.js':
                req.on('data', function(chunck) {
                    postData += chunck;
                });
                req.on('end', function() {
                    var website = qs.parse(postData);

//                    console.log(website.domainName);
//                    console.log(website.name);
//                    console.log(website.email);
//                    console.log(website.age);
//                    console.log(website.click);

                    websites.push(website);

                    var html = "<html><head><meta charset='utf8'><title>捷讯网</title></head><body>"

                    html += "<table>";
                    for (var i = 0;i <websites.length; i++) {
                        var row = "<tr>" +
                        "<td>" + websites[i].domainName + "</td>" +
                        "<td>" + websites[i].name + "</td>" +
                        "<td>" + websites[i].email + "</td>" +
                        "<td>" + websites[i].age + "</td>" +
                        "<td>" + websites[i].click + "</td>" +
                        "</tr>";
                        html += row;
                    }

                    html += "</table>";
                    html += '</body></html>';
                    res.writeHeader(200, {"Content-Type": 'text/html'});
                    res.end(html);

//                    res.end(JSON.stringify(websites));

//                    console.log(postData);
//                    res.end(postData);
                });
                break;
        }
    }

}).listen(7798);