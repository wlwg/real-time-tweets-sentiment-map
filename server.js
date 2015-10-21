var twitter = require('twit');
var express = require('express');
var http = require('http');
var socketio = require('socket.io');
var sentiment = require('sentiment');

var TwitterStreamService = function(server){
	var self = this;
	self.io = socketio(server);
	self.clientCount = 0;

	self.twitter_stream = null;
	self.twitter_trends = {
		'created_at': null,
		'trends': null
	};
	self.twitter_api = 
			new twitter({
				consumer_key: process.env.OPENSHIFT_APP_TWITTER_CONSUMER_KEY,
				consumer_secret: process.env.OPENSHIFT_APP_TWITTER_CONSUMER_SECRET,
				access_token: process.env.OPENSHIFT_APP_TWITTER_ACCESS_TOKEN,
				access_token_secret: process.env.OPENSHIFT_APP_TWITTER_ACCESS_TOKEN_SECRET
			});

	self.SetupSocketCallback = function(){
		self.io.on('connection', function (socket) {
			console.log(new Date() + ' - A new client is connected.');
			if(self.twitter_stream !== null && self.clientCount === 0){
				self.twitter_stream.start();
				console.log(new Date() + ' - Restarted streaming.');
			}
			self.clientCount ++;
			socket.emit("connected");

		  	socket.on('start-streaming', function() {
		  		console.log(new Date() + ' - Received new event <start-streaming>.');
		  		if(self.twitter_stream === null)
			    	self.SetupTwitterStreamCallback(socket);
		  	});
		  	socket.on('get-trends', function(){
		  		console.log(new Date() + ' - Received new event <get-trend>.');
		  		self.GetTwitterTrends(socket);
		  	});
		  	socket.on('disconnect', function() {
				console.log(new Date() + ' - A client is disconnected');
				self.clientCount --;
				if(self.clientCount < 1){
					self.twitter_stream.stop();
					console.log(new Date() + ' - All clients are disconnected. Stopped streaming.');
				}
			});
		});
	}

	self.SetupTwitterStreamCallback = function(socket){
      	self.twitter_stream = self.twitter_api.stream(
      		'statuses/filter', 
      		{'locations':'-180,-90,180,90', 'language':'en'});

      	self.twitter_stream.on('tweet', function(tweet) {
      		//console.log(new Date() + ' - Received new tweet.');
          	if (tweet.coordinates && tweet.coordinates !== null){
          		tweet.sentiment = sentiment(tweet.text);
              	socket.broadcast.emit("new-tweet", tweet);
              	socket.emit('new-tweet', tweet);
          	}
         });

      	self.twitter_stream.on('error', function(error) {
      		console.log(new Date() + ' - Twitter stream error: %j', error);
      		socket.broadcast.emit("stream-error");
          	socket.emit('stream-error');
		});

      	self.twitter_stream.on('connect', function(request) {
		    console.log(new Date() + ' - Connected to Twitter stream API.');
		});

		self.twitter_stream.on('reconnect', function (request, response, connectInterval) {
		  	console.log(new Date() + ' - Trying to reconnect to Twitter stream API in ' + connectInterval + ' ms.');
		});

      	self.twitter_stream.on('limit', function(limitMessage) {
        	console.log(new Date() + ' - Twitter stream limit error: %j', limitMessage);
        	socket.broadcast.emit("stream-limit");
          	socket.emit('stream-limit');
      	});

      	self.twitter_stream.on('warning', function(warningMessage) {
       	 	console.log(new Date() + ' - Twitter stream warning: %j', warningMessage);
      	});

      	self.twitter_stream.on('disconnect', function(disconnectMessage) {
        	console.log(new Date() + ' - Disconnected to Twitter stream API.');
      	});

      	console.log(new Date() + " - Initialized twitter streaming.");
	}

	self.GetTwitterTrends = function(socket){
		if(self.twitter_trends.trends === null || (new Date() - self.twitter_trends.created_at) > 60000){
			console.log(new Date() + ' - Retrieving twitter trends.');
			self.twitter_api.get(
				'trends/place',
				{'id' : 1},
				function(error, trends, response){
					if(error){
						console.log(new Date() + ' - Error when retrieving twitter trends: ' + error);
						throw error;
					}
					console.log(new Date() + ' - Received twitter trends.');

					self.twitter_trends.created_at = new Date();
					self.twitter_trends.trends = trends[0].trends;
					console.log(new Date() + ' - Updated twitter trends cache.');

					socket.broadcast.emit("new-trends", self.twitter_trends.trends);
			        socket.emit('new-trends', self.twitter_trends.trends);
				});
		}
		else{
			socket.broadcast.emit("new-trends", self.twitter_trends.trends);
			socket.emit('new-trends', self.twitter_trends.trends);
		}
	}

	self.SetupSocketCallback();
}

var Application = function(){
	var self = this;

	self.Initialize = function(){
		self.ip        = process.env.OPENSHIFT_NODEJS_IP || 'localhost';
        self.port      = process.env.OPENSHIFT_NODEJS_PORT || 3000;

		self.app = express();
		self.app.use(express.static(__dirname + '/client'));

		self.server = http.Server(self.app);
		self.socketService = new TwitterStreamService(self.server);
	}

	self.Start = function(){
		self.server.listen(self.port, self.ip, function() {
            console.log(new Date() + ' - Server started. Listening on ' + self.ip + ':' + self.port);
        });
	}
}

var app = new Application();
app.Initialize();
app.Start();
