var express    = require('express'),
    utils      = require('../../utils'),
    PopIt      = require('../../popit'),
    config     = require('config'),
    fixtures   = require('pow-mongodb-fixtures');

module.exports = function () {

  var app = express.createServer();

  // belt and braces - throw if we are not in dev or testing mode
  if (app.settings.env != 'development' && app.settings.env != 'testing') {
    throw new Error("dev_helpers should only be loaded in 'development' or 'testing', not '" + app.settings.env + "'");
  }
  
  app.set('view engine', 'jade');
  app.set('views', __dirname + '/views');
  app.set('view options', { layout: false, pretty: true, });

  // update the master database to contain the instance, set its status to
  // active and then redirect the blowser to that instance's dev page.
  app.post('/add_instance_to_master', function(req,res,next) {
    var instance_slug = req.param('instance_slug');
    if (!instance_slug)
      throw new Error("need an 'instance_slug'");

    var Instance = req.popit.model('Instance');
    Instance.update(
      {
        slug:   instance_slug,
      },
      {
        email:  'test@example.com',
        status: 'active',
      },
      {upsert: true},
      function(err) {
        if (err) return next(err);

        // When done redirect the user to this instance
        res.redirect(utils.instance_base_url_from_slug(instance_slug) + '/_dev');
      }
    );

  });
  

  app.post('/delete_instance', function(req,res,next) {

    var instance_slug = req.param('instance_slug');
    if (!instance_slug)
      throw new Error("need an 'instance_slug'");

    req.popit.model('Instance').findOne({slug: instance_slug}).remove(function(err) {
      if (err) return next(err);

      dropInstanceDatabase(
        instance_slug,
        function(err) {
          res.local("message","OK - deleted instance '" + instance_slug + "'");
          req.popit.clear_cached_settings();
          next(err);
        }
      );

    });

  });
  
  
  function dropInstanceDatabase (slug, cb ) {
    var popit_prefix = config.MongoDB.popit_prefix;
    var db_name = popit_prefix + slug;
    utils.delete_database( db_name, cb );
  }
  
  // Delete the current instance database
  app.post('/delete_instance_database', function(req,res,next) {
    dropInstanceDatabase(
      req.popit.instance_name(),
      function(err) {
        res.local('message', 'OK - database deleted');
        req.popit.clear_cached_settings();
        next(err);
      }
    );
  });
  
  
  // Load the testing fixture
  app.post('/load_test_fixture', function (req,res,next) {

    var instance = fixtures.connect( config.MongoDB.popit_prefix + req.popit.instance_name() );

    instance.load( '../fixtures/foobar_instance.js', function (err) {
      if (err) return next(err);
      res.local('message','OK - test fixture loaded');            
      instance.db.close(next);
    });
    
  });


  // Sync all the instances
  app.post('/fetch_all_active_instance_info', function ( req, res, next ) {
    req.popit.model('Instance').fetch_all_active_instance_info( function (err) {
      res.local('message','OK - all instances synced');            
      next(err);
    });
  });


  // Show the last email saved
  app.get( '/last_email', function (req, res, next) {
      
      req.popit
        .model('Email')
        .find()
        .sort('created', -1)
        .exec( function (err, docs) {
          if (err) return next(err);
          var html = docs[0].message.text;            
          html = html.replace( /(http\S+)/, '<a href="$1">$1</a>' );            
          res.send( '<pre>' + html + '</pre>' );
        });
      
  });


  // Show the index page with a message
  function show_index_page (req,res) {
    res.render('index');
  }

  // all posts should fall through having set a message to be shown
  app.post('*', show_index_page );

  // index page
  app.get('/', show_index_page  );
  
  // Catch all remaining gets and send them to the index page
  app.get('*', function(req,res) {
    res.redirect('/')
  });


  return app;
};
