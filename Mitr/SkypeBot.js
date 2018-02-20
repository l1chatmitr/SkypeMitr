/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

const http = require('http');
http.createServer((req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/plain; charset=UTF-8'
    });
    
    res.end('Hello from SkypeBot.\n');
    
}).listen(9080, "");
