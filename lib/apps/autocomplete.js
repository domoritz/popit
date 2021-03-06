var express       = require('express'),
    Error404      = require('../errors').Error404,
    regexp_quote  = require('regexp-quote'),
    _             = require('underscore');


var app = module.exports = express.createServer();
  
app.mounted(function(parent){

  var app = this;
  

  app.get('/organisation_name', function (req,res) {
    var term = req.param('term');
    if (!term) return res.json([]);

    req.popit
      .model('Organisation')
      .find()
      .select('name','slug')
      .regex('name', new RegExp( regexp_quote(term), 'i') ) // FIXME - replace with something smarter - most likely something search engine based
      .limit(10)
      .exec(function(err,docs) {
        if (err) throw err;

        var suggestions = _.map(docs, function(item) {
          return {label: item.name, value: item.slug };
        });

        res.json(suggestions);
      });

  });
    
  app.get('/position_title', function (req,res) {
    var term = req.param('term');
    if (!term) return res.json([]);

    req.popit
      .model('Position')
      .distinct('title')
      .regex('title', new RegExp( regexp_quote(term), 'i') ) // FIXME - replace with something smarter - most likely something search engine based
      .limit(10)
      .exec(function(err,docs) {
        if (err) throw err;
        res.json(docs);
      });

  });
    
});
