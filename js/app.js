var map;
var current_lati;
var current_longi;

function initialize() {
    var mapOptions = {
          center: new google.maps.LatLng(48.463104,-123.312141),
          zoom: 2,
          mapTypeId: google.maps.MapTypeId.ROADMAP
        };
    map = new google.maps.Map(document.getElementById("map_canvas"),
            mapOptions);
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            current_lati = position.coords.latitude;
            current_longi = position.coords.longitude;
            var pos = new google.maps.LatLng(current_lati, current_longi);
            
            map.setCenter(pos);
            var icon = new google.maps.MarkerImage("http://www.google.com/intl/en_us/mapfiles/ms/micons/green-dot.png");
            var marker = new google.maps.Marker({
                map: map,
                title: "",
                position: pos,
                draggable:true,
                animation: google.maps.Animation.DROP,
                icon: icon
            });  
            marker.setMap(map);
            var infowindow = new google.maps.InfoWindow({
                content: "You are here."
            });
            google.maps.event.addListener(marker, 'click', function(){
                if (marker.getAnimation() != null) {
                  marker.setAnimation(null); 
                  if(infowindow.getMap() != null) infowindow.close();          
                } else {
                  marker.setAnimation(google.maps.Animation.BOUNCE);
                  infowindow.open(map,marker);
                }
            });

            document.getElementById("po_lati").value = current_lati;
            document.getElementById("po_longi").value = current_longi;

        }, function() {
            handleNoGeolocation(true);
        });
    } else {
        handleNoGeolocation(false);
    } 
}

// google.maps.event.addDomListener(window, 'load', initialize);
function handleNoGeolocation(errorFlag) {
    if (errorFlag) {
    var content = 'Error: The Geolocation service failed. Enter your Address in the search bar.';
    } else {
        var content = 'Error: Your browser doesn\'t support geolocation. Try Chrome or Firefox';
    }
    var options = {
        map: map,
        position: new google.maps.LatLng(48.463104,-123.312141),
        content: content
    };
    var infowindow = new google.maps.InfoWindow(options);
    map.setCenter(options.position);
}

function gettweets(){
    var keyword = document.getElementById("key").value;
    var tweet_num = document.getElementById("tweet_num").value;
    if (keyword == ''){
      alert("Please enter a keyword!");
    }
    else if(tweet_num == ''){
      alert("Please enter a number!")
    }
    $.ajax({
           url: "/",
           type: "POST",
           data: {
              buttonid:"gettweets",
              keyword: keyword,
              tweet_num: tweet_num,
              pos_lati: current_lati,
              pos_longi: current_longi
           },
           dataType: "json",
           success: showtweets,
           error: function (data) {
                  alert("Fail to get tweets!");
            }
    });
}
function showtweets(data){
    if (data.search_status == 1){
      alert("Sorry. I have tried my best but only find "+data.count+" tweets...");
    }
    for (var i = 0, len = data.tweets.length; i<len; i++){

        var pos = new google.maps.LatLng(data.tweets[i].geo[0], data.tweets[i].geo[1]);  
        var title = data.tweets[i].status+"<br>Sentiment Value: "+data.tweets[i].sentiment;
        var sentiment = data.tweets[i].sentiment;
        var source_url = data.tweets[i].source;
        showeach(title, pos, sentiment, source_url);

    } 
}

function showeach(title, pos, sentiment,source_url){
    var icon;
    if (sentiment > 0){
      html = '<IMG BORDER="0" SRC="https://pbs.twimg.com/media/BWq5Hy9CEAEMUOF.jpg" height = "30" width = "30">';
      icon = new google.maps.MarkerImage("http://www.google.com/intl/en_us/mapfiles/ms/micons/red-dot.png");
    }
    else if (sentiment == 0){
      html = '<IMG BORDER="0" SRC="https://pbs.twimg.com/media/BWq5MPRCcAEu_4l.jpg" height = "30" width = "30">';
      icon = new google.maps.MarkerImage("http://www.google.com/intl/en_us/mapfiles/ms/micons/yellow-dot.png");
    }
    else if (sentiment < 0){
      html = '<IMG BORDER="0" SRC="https://pbs.twimg.com/media/BWq5KNJCIAAaC-h.jpg" height = "30" width = "30">';
      icon = new google.maps.MarkerImage("http://www.google.com/intl/en_us/mapfiles/ms/micons/blue-dot.png");
    }

    var marker = new google.maps.Marker({
        map: map,
        title: 'source:'+source_url,
        position: pos,
        draggable:true,
        animation: google.maps.Animation.DROP,
        icon: icon
    });
    marker.setMap(map);

    var infowindow = new google.maps.InfoWindow({
      content: ''
    })
    infowindow.setContent(html);
    infowindow.setContent(title+html);
    google.maps.event.addListener(marker, 'click', function(){          
        if (marker.getAnimation() != null) {
          marker.setAnimation(null); 
          if(infowindow.getMap() != null) infowindow.close();          
        } else {
          marker.setAnimation(google.maps.Animation.BOUNCE);
          infowindow.open(map,marker);
        }
    });
}


function gettrends(){
    $.ajax({
           url: "/",
           type: "POST",
           data: {
              buttonid: "gettrends",
              pos_lati: current_lati,
              pos_longi: current_longi
           },
           dataType: "json",
           success: showtrends,
           error: function (data) {
                  alert("Fail to get tweets!");
            }
    });
}
function showtrends(data){
    $("#trends").html(data["content"]);
}
