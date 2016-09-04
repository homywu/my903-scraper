//
// # SimpleServer
//
// A simple chat server using Socket.IO, Express, and Async.
//
var fs = require('fs');
var express = require('express');
var cheerio = require("cheerio");
var request = require("request");
var app = express();

app.get('/scrape', function(req, res){
  
  var url = "www.my903.tk/page/1";
  
  request(url, function(error, response, html){
    
    if(!error){
      var $ = cheerio.load(html);
      
      var mp3;
      
      $('.wp-audio-shortcode').each(function() {
        var data = $(this);
        
        mp3 = data.first().text();
        
        console.log(mp3);
      })
    }
  })
  
});

app.listen('8081');

console.log('app started on port 8081');

exports = module.exports = app;