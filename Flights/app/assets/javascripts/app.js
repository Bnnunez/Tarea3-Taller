'use strict';

var eventsToListen = ['POSITION', 'FLIGHTS', 'AIRPORTS'];
var socket = {};
var disconnectedInerval;
var url = '';
var escribir = false;
var options = '';
var title = "Air-Nunez";
var localdb = null;
var mapa;
var flights = [];
var airports= [];
var planes=[];
var airport_marker =[];
var plain_marker = {};
var ultimo_abierto;
var mark;

$(function() {
  if (escribir){
    $('#write').show();
    $('#eventPanels').prepend(makePanel('POSITION'));
    $('#eventPanels').prepend(makePanel('FLIGHTS'));
    $('#eventPanels').prepend(makePanel('AIRPORTS'));
  };
  initHistory();
});


//Google maps
function setMarker_maps_airport(key,json){
  if (!airports.includes(key)){
    airports.push(key);
    var position = {lat: json[key]["airport_position"][0], lng: json[key]["airport_position"][1]};
    var marker = new google.maps.Marker({
      position: position,
      map: mapa,
      title: json[key]['name']
    });
    airport_marker.push(marker);
    var contentString = '<div id="content">'+
       '<div id="siteNotice">'+
       '</div>'+
       '<h1 id="firstHeading" class="firstHeading">'+key+'</h1>'+
       '<div id="bodyContent" style="text-align:left">'+
       '<p><b>Nombre</b>: '+json[key]['name']+'</p>'+
       '<p><b>Ciudad</b>: '+json[key]['city']+'</p>'+
       '<p><b>País</b>: '+json[key]['country']+'</p>'+
       '<p><b>Codigo del Pais</b>: '+json[key]['country_code']+'</p>'+
       '<p><b>Codigo del Aeropuerto</b>: '+json[key]['airport_code']+'</p>'+
       '<p><b>Posicion del Aeropuerto</b>: '+json[key]['airport_position']+'</p>'+

       '</div>'+
       '</div>';

   var infowindow = new google.maps.InfoWindow({
     content: contentString
   });
   marker.addListener('click', function() {
     infowindow.open(mapa, marker);
     cerrar_last_open();
     mark =marker;
     ultimo_abierto = infowindow;
   });
  }
}

function cerrar_last_open(){
  if (ultimo_abierto){
    ultimo_abierto.close(mapa, mark);
  };
}

function setMarker_maps(data){
  var position = {lat: data["position"][0], lng: data["position"][1]};

  var new_marker = new google.maps.Circle({
    center: position,
    radius: 50,
    strokeColor: '#009900',
    map: mapa
  });
  if (!planes.includes(data["code"]) ){
    planes.push(data["code"]);
    var marker = new google.maps.Marker({
      position: position,
      map: mapa,
      icon: 'https://static.getjar.com/icon-50x50/f2/856551_thm.jpg',
      title: data["code"]
    });
    plain_marker[data['code']]={'marker':marker};
    emitData('AIRPORTS');
    emitData('FLIGHTS');
  }
  var latlng = new google.maps.LatLng(data["position"][0],data["position"][1])
  plain_marker[data['code']]['marker'].setPosition(latlng);
}


function create_info_window_plane(data, marker){
  var contentString = '<div id="content">'+
     '<div id="siteNotice">'+
     '</div>'+
     '<h1 id="firstHeading" class="firstHeading">'+data['code']+'</h1>'+
     '<div id="bodyContent" style="text-align:left">'+
     '<p><b>Aerolinea</b>: '+data['airline']+'</p>'+
     '<p><b>Origen</b>: '+data['origin']['name']+'</p>'+
     '<p><b>Destino</b>: '+data['destination']['name']+'</p>'+
     '<p><b>Avion</b>: '+data['plane']+'</p>'+
     '<p><b>Asientos</b>: '+data['seats']+'</p>'+

     '</div>'+
     '</div>';

 var infowindow = new google.maps.InfoWindow({
   content: contentString
 });

 marker.addListener('click', function() {
   infowindow.open(mapa, marker);
   cerrar_last_open();
   mark=marker;
   ultimo_abierto = infowindow;
 });
}

function setflypath(data){
  if (!flights.includes(data["code"]) ){
    flights.push(data["code"]);
    var flightPlanCoordinates = [
            {lat: data["origin"]["airport_position"][0], lng: data["origin"]["airport_position"][1]},
            {lat: data["destination"]["airport_position"][0], lng: data["destination"]["airport_position"][1]}
          ];

    create_info_window_plane(data, plain_marker[data['code']]['marker']);
    var flightPath = new google.maps.Polyline({
      path: flightPlanCoordinates,
      geodesic: true,
      strokeColor: '#FF0000',
      strokeOpacity: 1.0,
      strokeWeight: 2
    });
    flightPath.setMap(mapa);


  };

}

//Conexion
function connect_websocket(){
  url = "wss://integracion-tarea-3.herokuapp.com";
  options = '{"path":"/flights"}';
  var opt = options ? JSON.parse(options) : null;
  socket = io(url, $.extend({}, opt, {
    transports: ['websocket']
  }));
  //setHash();
  socket.on('connect', function() {
    clearInterval(disconnectedInerval);
    document.title = title;
  });
  socket.on('disconnect', function(sock) {
    disconnectedInerval = setInterval(function() {
      if (document.title === "Disconnected") {
        document.title = title;
      } else {
        document.title = "Disconnected";
      }
    }, 800);
  });
  registerEvents();

}

function registerEvents() {
  if (socket.io) {
    $.each(eventsToListen, function(index, value) {
      socket.on(value, function(data) {
        if (!data) {
          data = '-- NO DATA --'
        }
        if (value=='POSITION'){
          setMarker_maps(data);
        }
        else if (value=='FLIGHTS'){
          data.forEach(function(entry){
            setflypath(entry);
          });
        }

        else if (value=='AIRPORTS'){
          for (var key in data){
            setMarker_maps_airport(key,data);
          };

        }
        if (escribir){
          var elementToExtend = $("#eventPanels").find("[data-windowId='" + value + "']");
          elementToExtend.prepend('<p><span class="text-muted">' + getFormattedNowTime() + '</span><strong> ' + JSON.stringify(data) + '</strong></p>');
        }

      });
    });
  }
}

//INTOCABLES
function parseJSONForm() {
  var result = '{"asd":1}';
  console.log("json to emit " + result);
  return JSON.parse(result);
}

function makePanel(event) {
  return `
    <div class="panel panel-primary">
      <div class="panel-heading">
        <h3 class="panel-title">On "` + event + `" Events</h3>
      </div>
      <div data-windowId="` + event + `" class="panel-body collapse in" id="panel-` + event + `-content">
      </div>
    </div>`;
}

function getFormattedNowTime() {
  var now = new Date();
  return now.getHours() + ":" +
    now.getMinutes() + ":" +
    now.getSeconds() + ":" +
    now.getMilliseconds();
}

function initDB(clear) {
  var dbName = 'socketioClientDB';
  if (clear) {
    localdb.destroy().then(function() {
      localdb = new PouchDB(dbName);
    });
  } else {
    localdb = new PouchDB(dbName);
  }
}

function initHistory() {
  initDB(false);
  var ddoc = {
    _id: '_design/index',
    views: {
      index: {
        map: function mapFun(doc) {
          emit(doc._id, doc);
        }.toString()
      }
    }
  };
  localdb.put(ddoc).catch(function(err) {
    if (err.name !== 'conflict') {
      throw err;
    }
  }).then(function() {
    return localdb.query('index', {
      descending: true,
      limit: 20
    });
  }).then(function(result) {
    var rows = result.rows;
    for (var i in rows) {
      var history = rows[i].value;

    }
  }).catch(function(err) {
    console.log(err);
  });
}

function emit(event, data, panelId) {
  console.log('Emitter - emitted: ' + data);

  var emitData = {
    event: event,
    request: data,
    time: getFormattedNowTime()
  };

  socket.emit(event, data, function(res) {
    var elementToExtend = $("#emitAckResPanels").find("[data-windowId='" + panelId + "']");
    elementToExtend.prepend('<p><span class="text-muted">' + getFormattedNowTime() + '</span><strong> ' + JSON.stringify(res) + '</strong></p>');
  });
}

function emitData(e){
  if (socket.io) {
    var event = e;
    var data= parseJSONForm();
    if (event !== '' && data !== '') {
      var emitData = {
        event: event,
        request: data,
        time: getFormattedNowTime()
      };
      emit(event, data, 'emitAck-' + event);

    } else {

      console.error('Emitter - Invalid event name or data');
    }
  } else {
    console.error('Emitter - not connected');
  };
}
