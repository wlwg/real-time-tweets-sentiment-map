var module = angular.module('app', []);

module.factory('socket', function($rootScope){
    var socket = io.connect(window.location.href);
  	return {
        on: function (eventName, callback) {
            socket.on(eventName, function () {
            	var args = arguments;
                $rootScope.$apply(function () {
                    callback.apply(socket, args);
                });
            });
        },
        emit: function (eventName, data, callback) {
	      	socket.emit(eventName, data, function () {
	        	$rootScope.$apply(function () {
	          		if (callback) {
	            		callback.apply(socket, data);
	          		}
	        	});
	      	})
	    }
    };
});

module.factory('GoogleMap', function(){
    
    var mapZoom = 2;
    var centerLng = -10;

    //set zoon smaller on small screen
    if(screen.width <= 550)
    	mapZoom = 1;
    
    //use different map center on different size of screens
    if(screen.width > 550 && screen.width < 700)
    	centerLng = -40;
    if(screen.width < 350)
    	centerLng = -30;

    var mapOptions = {
		center: {lat: 20, lng: centerLng},
		zoom: mapZoom
	}
	return new google.maps.Map($('#map-canvas')[0], mapOptions);
});

module.controller('MapController', function($scope, GoogleMap, socket){
	var keyword = null;
	var markers = [];
	$scope.showLimitMessage = false;
	$scope.keyword = null;
	$scope.stopBtnValue = 'Stop';
	$scope.trends = [];

	$scope.RestartBtnClick = function(){
		for (var i = 0; i < markers.length; i++) {
            markers[i].setMap(null);
        }
        markers = [];
		keyword = $scope.keyword.trim();
	}

	$scope.StopBtnClick = function(){
		if($scope.stopBtnValue === 'Stop')
			$scope.stopBtnValue = 'Continue';
		else
			$scope.stopBtnValue = 'Stop';
	}

	socket.on('connected', function(){
		socket.emit('start-streaming');
		socket.emit('get-trends');
	});
	socket.on('new-tweet', function(tweet){
		$scope.showLimitMessage = false;
		if($scope.stopBtnValue === 'Stop' &&
			(!keyword || keyword.length === 0 
				|| tweet.text.toLowerCase().indexOf(keyword.toLowerCase()) > -1))
		{
			var icon = null;
			if(tweet.sentiment.score < 0)
				icon = '../res/img/marker-red.png';
			if(tweet.sentiment.score == 0)
				icon = '../res/img/marker-yellow.png';
			if(tweet.sentiment.score > 0)
				icon = '../res/img/marker-green.png';


	      	var marker = new google.maps.Marker({
	         	map: GoogleMap,
	          	title: '@' + tweet.user.name,
	         	position: new google.maps.LatLng(tweet.coordinates.coordinates[1], tweet.coordinates.coordinates[0]),
	          	draggable: false,
	         	animation: google.maps.Animation.DROP,
	          	icon: icon
	      	}); 
	      	marker.setMap(GoogleMap);
	      	markers.push(marker);

	      	var info = '<div class="row text-center tweet-info-window">'
	      				+	'<div class="col-md-2 text-center">' 
	      				+		'<img class="img-responsive" src=' + tweet.user.profile_image_url + '></img>'
	      				+	'</div>'
	      				+	'<div class="col-md-10 text-left">' 
	      				+		'<p>' + '@' + tweet.user.name + '</p>'
	      				+ 		'<p><strong>' + tweet.text + '</strong></p>'
	      				+ 		'<p>' + tweet.created_at;
	      	if(tweet.place){
	      		info += '<br>' 
	      				+ tweet.place.name + ', ' 
	      				+ tweet.place.country;
	      	}
	      	info += '</p></div></div>';

	      	var infowindow = new google.maps.InfoWindow({
	        	  content: info,
	        	  maxWidth: 350
	      	});
	      	google.maps.event.addListener(marker, 'click', function(){
	        	infowindow.open(GoogleMap, marker);
	      	});
      	}
	});

	socket.on('new-trends', function(trends){
		$scope.trends = trends;
	});

	socket.on('rate-limit', function(){
		$scope.showLimitMessage = true;
	});
});