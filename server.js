var twitter = require('twitter');
var express = require('express');
var http = require('http');
var socketio = require('socket.io');
var sentiment = require('sentiment');

var TwitterStreamService = function(server){
	var self = this;
	self.io = socketio(server);

	self.twitter_api = 
			new twitter({
				consumer_key: process.env.OPENSHIFT_APP_TWITTER_CONSUMER_KEY,
				consumer_secret: process.env.OPENSHIFT_APP_TWITTER_CONSUMER_SECRET,
				access_token_key: process.env.OPENSHIFT_APP_TWITTER_ACCESS_TOKEN_KEY,
				access_token_secret: process.env.OPENSHIFT_APP_TWITTER_ACCESS_TOKEN_SECRET
			});
	self.twitter_stream = null;
	self.twitter_search = null;

	self.SetupSocketCallback = function(){
		self.io.on('connection', function (socket) {
			console.log('A client connected');
		  	socket.on('start-streaming', function() {
		  		console.log('Start streaming');
			    self.SetupTwitterStreamCallback(socket);
		  	});
		  	socket.on('get-trends', function(){
		  		console.log('Retrieving trends');
		  		self.SetupTwitterTrendsCallback(socket);
		  	});
		    socket.emit("connected");
		});
	}

	self.SetupTwitterStreamCallback = function(socket){
		if(self.twitter_stream === null){
	      	self.twitter_stream = self.twitter_api.stream(
	      		'statuses/filter', 
	      		{'locations':'-180,-90,180,90', 'language':'en'}, 
	      		function(stream) {
		          	stream.on('data', function(tweet) {
		              	if (tweet.coordinates && tweet.coordinates !== null){
		              		tweet.sentiment = sentiment(tweet.text);
		                  	socket.broadcast.emit("new-tweet", tweet);
		                  	socket.emit('new-tweet', tweet);
		                  	console.log(tweet.text);
		              	}
		             });
 
		          	stream.on('error', function(error) {
		          		console.log(error.message);
					});

	              	stream.on('connect', function(request) {
					    console.log('Connected to Twitter API.');
					});

					stream.on('reconnect', function (request, response, connectInterval) {
					  	console.log('Trying to reconnect to Twitter API in ' + connectInterval + ' ms.');
					});

	              	stream.on('limit', function(limitMessage) {
	                	console.log(limitMessage);
	              	});

	              	stream.on('warning', function(warningMessage) {
	               	 	console.log(warningMessage);
	              	});

	              	stream.on('disconnect', function(disconnectMessage) {
	                	console.log(disconnectMessage);
	              	});
	      		}
	      	);
		}
	}

	self.SetupTwitterTrendsCallback = function(socket){
		if(self.twitter_search === null){
			self.twitter_api.get(
			'trends/place',
			{'id' : 1},
			function(error, trends, response){
				if(error){
					console.log(error);
					throw error;
				}
				socket.broadcast.emit("new-trends", trends);
		        socket.emit('new-trends', trends[0].trends);
			});
		}
	}

	self.SetupSocketCallback();
}

var Application = function(){
	var self = this;

	self.Initialize = function(){
		self.ip        = process.env.OPENSHIFT_NODEJS_IP || 'localhost';
        self.port      = process.env.OPENSHIFT_NODEJS_PORT || 8080;

		self.app = express();
		self.app.use(express.static(__dirname + '/client'));

		self.server = http.Server(self.app);
		self.socketService = new TwitterStreamService(self.server);
	}

	self.Start = function(){
		self.server.listen(self.port, self.ip, function() {
            console.log("Listening on " + self.ip + ":" + self.port);
        });
	}
}

var app = new Application();
app.Initialize();
app.Start();
