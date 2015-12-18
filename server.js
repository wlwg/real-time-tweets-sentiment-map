var twitter = require('twit');
var express = require('express');
var http = require('http');
var socketio = require('socket.io');
var sentiment = require('sentiment');

var TwitterStreamService = function(server){
	var self = this;
	var io = socketio(server);
	var clientCount = 0;

	var twitter_stream = null;
	var twitter_trends = {
		'created_at': null,
		'trends': null
	};
	var twitter_api = 
			new twitter({
				consumer_key: process.env.OPENSHIFT_APP_TWITTER_CONSUMER_KEY,
				consumer_secret: process.env.OPENSHIFT_APP_TWITTER_CONSUMER_SECRET,
				access_token: process.env.OPENSHIFT_APP_TWITTER_ACCESS_TOKEN,
				access_token_secret: process.env.OPENSHIFT_APP_TWITTER_ACCESS_TOKEN_SECRET
			});

	var SetupSocketCallback = function(){
		io.on('connection', function (socket) {
			console.log(new Date() + ' - A new client is connected.');
			if(twitter_stream !== null && clientCount === 0){
				twitter_stream.start();
				console.log(new Date() + ' - Restarted streaming.');
			}
			clientCount ++;
			socket.emit("connected");

		  	socket.on('start-streaming', function() {
		  		console.log(new Date() + ' - Received new event <start-streaming>.');
		  		if(twitter_stream === null)
			    	SetupTwitterStreamCallback(socket);
		  	});
		  	socket.on('get-trends', function(){
		  		console.log(new Date() + ' - Received new event <get-trend>.');
		  		GetTwitterTrends(socket);
		  	});
		  	socket.on('disconnect', function() {
				console.log(new Date() + ' - A client is disconnected');
				clientCount --;
				if(clientCount < 1){
					twitter_stream.stop();
					console.log(new Date() + ' - All clients are disconnected. Stopped streaming.');
				}
			});
		});
	}

	SetupTwitterStreamCallback = function(socket){
      	twitter_stream = twitter_api.stream(
      		'statuses/filter', 
      		{'locations':'-180,-90,180,90', 'language':'en'});

      	twitter_stream.on('tweet', function(tweet) {
      		//console.log(new Date() + ' - Received new tweet.');
          	if (tweet.coordinates && tweet.coordinates !== null){
          		tweet.sentiment = sentiment(tweet.text);
              	socket.broadcast.emit("new-tweet", tweet);
              	socket.emit('new-tweet', tweet);
          	}
         });

      	twitter_stream.on('error', function(error) {
      		console.log(new Date() + ' - Twitter stream error: %j', error);
      		socket.broadcast.emit("stream-error");
          	socket.emit('stream-error');
		});

      	twitter_stream.on('connect', function(request) {
		    console.log(new Date() + ' - Connected to Twitter stream API.');
		});

		twitter_stream.on('reconnect', function (request, response, connectInterval) {
		  	console.log(new Date() + ' - Trying to reconnect to Twitter stream API in ' + connectInterval + ' ms.');
		});

      	twitter_stream.on('limit', function(limitMessage) {
        	console.log(new Date() + ' - Twitter stream limit error: %j', limitMessage);
        	socket.broadcast.emit("stream-limit");
          	socket.emit('stream-limit');
      	});

      	twitter_stream.on('warning', function(warningMessage) {
       	 	console.log(new Date() + ' - Twitter stream warning: %j', warningMessage);
      	});

      	twitter_stream.on('disconnect', function(disconnectMessage) {
        	console.log(new Date() + ' - Disconnected to Twitter stream API.');
      	});

      	console.log(new Date() + " - Initialized twitter streaming.");
	}

	GetTwitterTrends = function(socket){
		if(twitter_trends.trends === null || (new Date() - twitter_trends.created_at) > 60000){
			console.log(new Date() + ' - Retrieving twitter trends.');
			twitter_api.get(
				'trends/place',
				{'id' : 1},
				function(error, trends, response){
					if(error){
						console.log(new Date() + ' - Error when retrieving twitter trends: ' + error);
						throw error;
					}
					console.log(new Date() + ' - Received twitter trends.');

					twitter_trends.created_at = new Date();
					twitter_trends.trends = trends[0].trends;
					console.log(new Date() + ' - Updated twitter trends cache.');

					socket.broadcast.emit("new-trends", twitter_trends.trends);
			        socket.emit('new-trends', twitter_trends.trends);
				});
		}
		else{
			socket.broadcast.emit("new-trends", twitter_trends.trends);
			socket.emit('new-trends', twitter_trends.trends);
		}
	}

	self.StartService = function(){
		SetupSocketCallback();
	}
}

var Application = function(){
	var self = this;

	self.Initialize = function(){
		self.ip        = process.env.OPENSHIFT_NODEJS_IP || 'localhost';
        self.port      = process.env.OPENSHIFT_NODEJS_PORT || 3000;

		var app = express();
		app.use(express.static(__dirname + '/client'));
		self.server = http.Server(app);

		startTwitterStreamService();
	};

	var startTwitterStreamService = function(){
		var twitterStreamService = new TwitterStreamService(self.server);
		twitterStreamService.StartService();
	};

	self.Start = function(){
		self.server.listen(self.port, self.ip, function() {
            console.log(new Date() + ' - Server started. Listening on ' + self.ip + ':' + self.port);
        });
	};
}

var app = new Application();
app.Initialize();
app.Start();
