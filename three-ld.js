//////////////////////////////////////////////////////////////////////////////////////
// Communication with triplestore
//////////////////////////////////////////////////////////////////////////////////////

// content of request
const URL_GRAPHDB = "https://rdf.ontotext.com/4132505724/fog-demo2/repositories/fog-demo2"; //read-only endpoint for cloud DB
let headers = new Headers();
headers = {
	"Accept":"application/sparql-results+json", // json expected instead of default xml
	"Content-Type":"application/x-www-form-urlencoded",
};
const query1 = `### Query 1 (query sparql-visualizer tab 2)
### select all geometry (without reasoning)

PREFIX omg: <https://w3id.org/omg#>
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?value ?property ?datatype WHERE {
	?geometry ?property ?value ;
		a omg:Geometry .
	GRAPH <http://ontologies.org/fog/>{
		?property rdfs:subPropertyOf* ?omgProp .
		FILTER (?omgProp IN (omg:hasSimpleGeometryDescription , omg:hasComplexGeometryDescription)) .
	}
	BIND(DATATYPE(?value) AS ?datatype)
}`;
const query2 = `### Query 2 (query sparql-visualizer tab 4)
### select all geometry of column2 (without reasoning)

PREFIX omg: <https://w3id.org/omg#>
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX product: <https://w3id.org/product#>

SELECT ?value ?property ?datatype WHERE {
	BIND(<https://example.org/data#column2> AS ?column2)
	{
		# geometry directly connected to column2
		?column2 omg:hasGeometry ?geometry .
 	} UNION {
		# geometry of subparts of column2
		?column2 product:aggregates ?subPart .
		?subPart omg:hasGeometry ?geometry .
   	}
	?geometry ?property ?value ;
  		a omg:Geometry .
	BIND(DATATYPE(?value) AS ?datatype)
  	# only return asserted properties
   	GRAPH <http://ontologies.org/fog/>{
   		?property rdfs:subPropertyOf* ?omgProperty .
		FILTER (?omgProperty IN (omg:hasSimpleGeometryDescription , omg:hasComplexGeometryDescription))
  	}
}`;
const query3 = `### Query 3 (query sparql-visualizer tab 5)
### select specific geometry (fog:asObj_v3.0-obj and fog:asPly_v1.0-ascii) of column1 (without reasoning)

PREFIX fog: <https://w3id.org/fog#>
PREFIX omg: <https://w3id.org/omg#>
PREFIX product: <https://w3id.org/product#>

SELECT ?value ?property ?datatype WHERE {
  	BIND(<https://example.org/data#column1> AS ?column1)
	{
		# geometry directly connected to column1
		?column1 omg:hasGeometry ?geometry .
 	} UNION {
		# geometry of subparts of column1
		?column1 product:aggregates ?subPart .
		?subPart omg:hasGeometry ?geometry .
   	}
	?geometry ?property ?value .
	FILTER (?property IN (fog:asObj_v3.0-obj , fog:asPly_v1.0-ascii))
   	BIND(DATATYPE(?value) AS ?datatype)
}`;
const body1 = {
	query: query1,
	infer: false, // query does not need reasoning
};
const options1 = {
	method: 'POST',
	headers:headers,
	body:JSON_to_URLEncoded(body1), // turn JSON body into x-www-form-urlencoded
};

// send query1 to triplestore until response
fetchPromise(URL_GRAPHDB, options1); // initial query is send

//////////////////////////////////////////////////////////////////////////////////////
// Setup three.js scene + camera + renderer + controls
//////////////////////////////////////////////////////////////////////////////////////

// Create an empty scene
var scene = new THREE.Scene();
scene.background = new THREE.Color( 0xf0f0f0 );

// Create a basic perspective camera- TODO: zoom to fit objects
var camera = new THREE.PerspectiveCamera( 10, window.innerWidth/window.innerHeight, 1, 5000 );
camera.position.set(10, 5, 50); //vector of camera (viewdirection from this point to origin)

// Create a renderer with Antialiasing
var renderer = new THREE.WebGLRenderer({antialias:true});
// Configure renderer clear color
renderer.setClearColor("#000000");
// Configure renderer size
renderer.setSize( window.innerWidth, window.innerHeight );
// Append Renderer to DOM
//container.body.appendChild( renderer.domElement );
document.body.appendChild( renderer.domElement );

//////////////////////////////////////////////////////////////////////////////////////
// Setup DAT.GUI
//////////////////////////////////////////////////////////////////////////////////////

var gui = new dat.GUI( { autoplace: false, width: 320 }); // initialize fixed width 320

// settings = defaults
var settings = {
	color1: "#FF00B4", // css color
	//show1: true,
	notLoaded1: true,
}

// first tab - color legend per loaded geometry
var loadedGeometryColorTab = gui.addFolder('COLOR LEGEND LOADED GEOMETRY');

// second tab - show/hide per loaded geometry
/*var loadedGeometryShowTab = gui.addFolder('Show loaded geometry')
// create on/off button for loaded geometry GUI
settings[ 'showGltf' ] = true ;
loadedGeometryShowTab.add( settings , 'showGltf').name( fogProp );*/

// third tab - download per geometry
var geometryTab = gui.addFolder('DOWNLOAD GEOMETRY');

// fourth tab - not loaded geometry
var notLoadedTab = gui.addFolder('NOT LOADED GEOMETRY');

// open every tab by default
loadedGeometryColorTab.open();
geometryTab.open();
notLoadedTab.open();

//////////////////////////////////////////////////////////////////////////////////////
// HTML buttons
//////////////////////////////////////////////////////////////////////////////////////

// HTML element - downloading geometry
var link = document.createElement( 'a' );
link.style.display = 'none';
document.body.appendChild( link );

//HTML element - window listener and default export
var floatingDiv = document.createElement('div');
window.addEventListener( 'click', onWindowClick, false);

// link function to first button - show active query
var queryButton = document.getElementById('view_query');
queryButton.addEventListener('click', function() { renderQuery(query1); }); // initial value

// link function to button1 - launch query1
var queryButton1 = document.getElementById('query1');
queryButton1.addEventListener('click', function(){loadNewGeometry(query1)});

// link function to button2 - launch query2
var queryButton2 = document.getElementById('query2');
queryButton2.addEventListener('click', function(){loadNewGeometry(query2)});

// link function to button3 - launch query3
var queryButton3 = document.getElementById('query3');
queryButton3.addEventListener('click', function(){loadNewGeometry(query3)});

// start loading animation // source: https://spin.js.org/
var target = document.getElementById('spinner');
var spinner = new Spinner({color:'#000000', lines: 12 , scale: 3}).spin(target);

//////////////////////////////////////////////////////////////////////////////////////
// alternative 3D controls - trackball
//////////////////////////////////////////////////////////////////////////////////////

var controls = new THREE.TrackballControls( camera );
controls.rotateSpeed = 5.0;
controls.zoomSpeed = 3.2;
controls.panSpeed = 0.1;
controls.noZoom = false;
controls.noPan = false;
controls.staticMoving = false;
controls.dynamicDampingFactor = 0.2;

//////////////////////////////////////////////////////////////////////////////////////
// Additional three.js features: axis + lights
//////////////////////////////////////////////////////////////////////////////////////

// add axis to scene
var axisHelper = new THREE.AxesHelper( 5 ); // default Y-up (green) <=> Z (blue) and X (red)
scene.add( axisHelper );

// lights
var light = new THREE.DirectionalLight( 0xffffff ); //white
light.position.set( 1, 1, 1 );
scene.add( light );

var light = new THREE.DirectionalLight( 0xffffff ); // white
light.position.set( - 1, - 1, - 1 );
scene.add( light );

var light = new THREE.AmbientLight( 0x222222 ); //black
scene.add( light );

//////////////////////////////////////////////////////////////////////////////////////
// Export window
//////////////////////////////////////////////////////////////////////////////////////

// create 'export' window
floatingDiv.className = 'floating';
document.body.appendChild( floatingDiv );

//////////////////////////////////////////////////////////////////////////////////////
// start animation
//////////////////////////////////////////////////////////////////////////////////////

animationLoop();

//////////////////////////////////////////////////////////////////////////////////////
// functions: general
//////////////////////////////////////////////////////////////////////////////////////

// Render the scene
function renderIt (){
	renderer.render(scene, camera);
	camera.lookAt (scene.position);
}

// dynamic animationLoop - needed when working with controls
function animationLoop(){
	requestAnimationFrame(animationLoop);
	controls.update();
	renderIt();
}

// function to turn JSON body into x-www-form-urlencoded //source: https://gist.github.com/lastguest/1fd181a9c9db0550a847 // used
function JSON_to_URLEncoded(element,key,list){ 
	var list = list || [];
	if(typeof(element)=='object'){
	  for (var idx in element)
		JSON_to_URLEncoded(element[idx],key?key+'['+idx+']':idx,list);
	} else {
	  list.push(key+'='+encodeURIComponent(element));
	}
	return list.join('&');
}

// function to treat geometry accordingly to its datatype + provide download button
function decodeGeometry (element){
	// bind variables
	var p = element.property.value;
	var v = element.value.value;
	if ( !element.datatype){ // datatype variable does not exist in case of node instead of RDF literal (RDF-based geometry)
		var d = "";
	} else {
		var d = element.datatype.value;
	}
	var fogProp = p.replace('https://w3id.org/fog#', 'fog:');
	// action decoder depends on datatype
	switch(d){
		case "http://www.w3.org/2001/XMLSchema#anyURI":
			var fileLoc = v;
			if (v.includes('github.com')){ // modify regular Github link to raw Github link
				fileLoc = fileLoc.replace('github.com' , 'raw.githubusercontent.com');
				fileLoc = fileLoc.replace('blob/' , '');
			} else if (v.includes('dropbox.com')){ // modify regular Dropbox link to raw Dropbox link
				fileLoc = fileLoc.replace('dropbox.com' , 'dl.dropboxusercontent.com');
			}
			switchGeometryType( p , fileLoc , d );
			break;
		case "http://www.w3.org/2001/XMLSchema#hexBinary":
			// decode hex binary // source: https://github.com/michalbe/binascii/blob/master/index.js
			var str = v;
			var binary_string = '';
			for (var i=0, l=str.length; i<l; i+=2) {
				binary_string += String.fromCharCode(parseInt(str.substr(i, 2), 16));
			}
			switchGeometryType( p , binary_string , d);
			break;
		case "http://www.w3.org/2001/XMLSchema#base64Binary":
			// decode base64 binary
			var binary_string =  window.atob(v);
			switchGeometryType( p , binary_string , d);
			break;
		case "http://www.w3.org/2001/XMLSchema#string":
			// escape newlines => not needed
			// escape quotes => not needed
			switchGeometryType( p , v , d );
			break;
		case "": // RDF-based geometry
			switchGeometryType( p );
			break;

		default: // unknown binary encoding
			console.log("Failed to load geometry format " + fogProp + " with unknown binary encoding: " + d);
			createNotLoadedTag( fogProp );
	}
}

// function to transform binary string to bytes
function binaryStringToArraybuffer (binary_string){
	var len = binary_string.length;
	var bytes = new Uint8Array( len );
	for (var i = 0; i < len; i++) {
		bytes[i] = binary_string.charCodeAt(i);
	}
	return bytes;
}

// function create button for color legend of loaded geometry
function createLoadedLegend( legendName , fogProp , color ){
	settings[ legendName ] = color;
	loadedGeometryColorTab.addColor( settings , legendName ).name( fogProp );
}

// function create download button
function createDownloadButton( buttonName , fogProp , func ){
	settings [ buttonName ] = func;
	geometryTab.add( settings , buttonName ).name( fogProp );
}

// function to create not loaded tag
function createNotLoadedTag( fogProp ){
	settings[ 'notLoaded' ] = true ;
	notLoadedTab.add( settings , 'notLoaded' ).name( fogProp );
}

// function connecting FOG datatype property (geometry format) to corresponding three.js loader
var elementCounter = 0;
function switchGeometryType ( p , vPrepared , d ){
	var fogProp = p.replace('https://w3id.org/fog#', 'fog:');
	switch (p) {
		case "https://w3id.org/fog#asCollada_v1.4.1":
			var color = new THREE.Color(0x551A8B); //purple
			if (d == "http://www.w3.org/2001/XMLSchema#anyURI"){
				loadThisCollada( vPrepared , color);
				createLoadedLegend( 'colorCol1.4.1' , fogProp , '#551A8B' );
				// create download button in GUI
				var func = function() {
					fetch(vPrepared ).then(response => { 
						return response.text(); // return raw text instead of JSON with ReadableStream 
					}).then(text_string => {
						saveString(text_string , 'colladaFile.dae');
					})
				}
				createDownloadButton( 'downloadCollada' , fogProp , func )
			} else {
				//three.js somehow fails to load Collada from a string
				console.log("Geometry format of datatype " + d + " cannot be loaded: " + fogProp);
				createDownloadButton( 'downloadCollada' , fogProp , function() { saveString( element.v.value , 'colladaFile.dae' )} );
				createNotLoadedTag( fogProp );
			}
			break;
		case "https://w3id.org/fog#asObj_v3.0-obj":
			var color = new THREE.Color(0x83ef2b); //green
			if (d == "http://www.w3.org/2001/XMLSchema#anyURI"){
				loadThisOBJ( vPrepared , color );
				// create download button in GUI
				var func = function() {
					fetch(vPrepared ).then(response => { 
						return response.text(); // return raw text instead of JSON with ReadableStream 
					}).then(text_string => {
						saveString(text_string , 'objFile.obj');
					})
				};
				createDownloadButton( 'downloadObj' , fogProp , func );
			} else {
				loadThisOBJString( vPrepared , color );
				createDownloadButton( 'downloadObj' , fogProp , function() { saveString( vPrepared , 'objFile.obj')} );
			}
			createLoadedLegend( 'colorObj' , fogProp , '#83ef2b' );
			break;
		case "https://w3id.org/fog#asPly_v1.0-ascii":
			var color = new THREE.Color(0x00ffff); //cyan
			if (d == "http://www.w3.org/2001/XMLSchema#anyURI"){
				loadThisPLY( vPrepared , color );
				// create download button in GUI
				var func = function() {
					fetch(vPrepared ).then(response => { 
						return response.text(); // return raw text instead of JSON with ReadableStream 
					}).then(text_string => {
						saveString(text_string , 'ply-asciiFile.ply');
					})
				};
				createDownloadButton( 'downloadPlyAscii' , fogProp , func );
			} else {
				loadThisPLYString( vPrepared , color );
				createDownloadButton( 'downloadPlyAscii' , fogProp , function() { saveString( vPrepared , 'ply-asciiFile.ply')} );
			}
			createLoadedLegend( 'colorPly' , fogProp , '#00ffff' );
			break;
		case "https://w3id.org/fog#asPly_v1.0-binaryLE":
			var color = new THREE.Color(0xffa500); //orange
			if (d == "http://www.w3.org/2001/XMLSchema#anyURI") {
				loadThisPLY( vPrepared , color );
				createDownloadButton( 'downloadPlyBinary' , fogProp , function() { window.open(vPrepared , '_blank')} ); // create hyperlink that opens in new tab - download starts automatically if raw github
			} else { // RDF literal containing encoded binary data
				// binary string to bytes
				var bytes = binaryStringToArraybuffer(vPrepared);
				// feed the loader the arraybuffer
				loadThisPLYString( bytes.buffer , color );
				createDownloadButton( 'downloadPlyBinary' , fogProp , function() { saveBinary( escape(vPrepared) , 'ply-binaryFile.ply')} );
			}
			createLoadedLegend( 'colorPlyBinary' , fogProp , '#ffa500' );
			break;
		case "https://w3id.org/fog#asGltf_v2.0-glb":
			var color = new THREE.Color(0x0000FF); //blue
			if (d == "http://www.w3.org/2001/XMLSchema#anyURI"){
				loadThisGLTF( vPrepared , color );
				createDownloadButton( 'downloadGlb' , fogProp , function() { window.open(vPrepared , '_blank')} ); // create hyperlink that opens in new tab - download starts automatically if raw github
			} else { // RDF literal containing encoded binary data
				// binary string to bytes
				var bytes = binaryStringToArraybuffer(vPrepared);
				// feed the loader the arraybuffer
				loadThisGltfString( bytes.buffer , color );
				createDownloadButton( 'downloadGlb' , fogProp , function() { saveBinary( escape(vPrepared) , 'glbFile.glb')} );
			}
			createLoadedLegend( 'colorGlbBinary' , fogProp , '#0000FF' );
			break;
		case "https://w3id.org/fog#asGltf_v2.0-gltf": // expects gltf (JSON) with embedded geometry and textures
			var color = new THREE.Color(0xff0000); //red
			if (d == "http://www.w3.org/2001/XMLSchema#anyURI"){
				loadThisGLTF( vPrepared , color );
				createDownloadButton( 'downloadGltf' , fogProp , function() { window.open(vPrepared , '_blank')} ); // create hyperlink that opens in new tab - download starts automatically if raw github
			} else {
				loadThisGltfString( vPrepared , color );
				createDownloadButton( 'downloadGltf' , fogProp , function() { saveString( vPrepared , 'gltfFile.gltf')} );
			}
			createLoadedLegend( 'colorGltf' , fogProp , '#ff0000' );
			break;
		case "https://w3id.org/fog#asStep": 
			// no loader available in three.js for STEP
			console.log("Failed to load geometry format: " + fogProp);
			createDownloadButton( 'downloadStep' , fogProp , function() { saveString( vPrepared , 'stepFile.stp')} );
			createNotLoadedTag( fogProp );
			break;
		case "https://w3id.org/fog#asE57_v1.0":
			// no loader available in three.js for e57
			console.log("Failed to load geometry format: " + fogProp);
			createDownloadButton( 'downloadE57' , fogProp , function() { window.open(vPrepared , '_blank')} ); // create hyperlink that opens in new tab - download starts automatically if raw github
			createNotLoadedTag( fogProp );
			break;
		case "https://w3id.org/fog#asGeomOntology":
			// no loader available in three.js for GEOM RDF-based geometry
			console.log("Failed to load geometry format: " + fogProp);
			createNotLoadedTag( fogProp );
			break;

		default: 
			// no loader available in three.js or not yet prepared in above code
			console.log("Failed to load geometry format: " + fogProp );
			// create download button in GUI (not for RDF-based geometry)
			switch(d){
				case "http://www.w3.org/2001/XMLSchema#anyURI":
					// only works for xsd:anyURI if binary (not if ascii => directly to raw page)
					createDownloadButton( 'downloadFile' + elementCounter , fogProp , function() { window.open(vPrepared , '_blank') } );
					break;
				case "http://www.w3.org/2001/XMLSchema#string":
					createDownloadButton( 'downloadFile' + elementCounter , fogProp , function() { saveString( vPrepared , 'geometryFile.txt') } );
					break;
				case "http://www.w3.org/2001/XMLSchema#base64Binary":
				case "http://www.w3.org/2001/XMLSchema#hexBinary":
					createDownloadButton( 'downloadFile' + elementCounter , fogProp , function() { saveBinary( escape(vPrepared) , 'geometryFile.bin') } );
					break;
			};
			elementCounter++;
			createNotLoadedTag( fogProp );
	}
}

// function helping with saving to text file
function saveString( text , filename ) {
	var blob = new Blob( [ text ] , { type: 'text/plain' } );
	link.href = URL.createObjectURL( blob );
	link.download = filename;
	link.click();
}

// own function for helping with saving binary files
function saveBinary ( data , filename) {
	link.href = "data:application/plain;charset=utf-8," + data;
	link.download = filename;
	link.click();
}

//////////////////////////////////////////////////////////////////////////////////////
// functions: query triplestore
//////////////////////////////////////////////////////////////////////////////////////

// function that keeps sending request until response is returned // spirce: https://davidwalsh.name/fetch-timeout
function fetchPromise(url,ops){
	const FETCH_TIMEOUT = 15000;
	let didTimeOut = false;
	
	new Promise(function(resolve, reject) {
		const timeout = setTimeout(function() {
			fetchPromise(url,ops); //if timeout: try again
			didTimeOut = true;
			reject(new Error('Request timed out'));
		}, FETCH_TIMEOUT);
		
		fetch(url,ops)
		.then(function(response) {
			// Clear the timeout as cleanup
			clearTimeout(timeout);
			if(!didTimeOut && (response.status == 200)) {
				console.log('fetch good! ', response);
				spinner.stop(); // stop loading animation
				return response;
			};
		})
		.then(response => {
			return response.json();
		})
		.then(res => {
			//work with json - body of response
			var dataQuery = res.results; // bindings (array) > numbers > datatype/property/value > type/value
			// pass data for 3D visualisation per array element
			dataQuery.bindings.forEach(function(element) {
				decodeGeometry(element);
			});
		})
		.catch(function(err) {
			console.log('fetch failed! ', err);
			// Rejection already happened with setTimeout
			if(didTimeOut) return;
			// Reject with error
			reject(err);
		});
	})
	.then(function() {
		// Request success and no timeout
		console.log('good promise, no timeout! ');
	})
	.catch(function(err) {
		// Error: response error, request timeout or runtime error
		console.log('promise error! ', err);
	});
}

//////////////////////////////////////////////////////////////////////////////////////
// functions: launch new query + reinit everything
//////////////////////////////////////////////////////////////////////////////////////

function loadNewGeometry(query){
	// remove every element from the scene first
	scene.remove.apply(scene , scene.children );
	// add axis again
	scene.add( axisHelper );
	// add lights again
	var light = new THREE.DirectionalLight( 0xffffff ); //white
	light.position.set( 1, 1, 1 );
	scene.add( light );
	var light = new THREE.DirectionalLight( 0xffffff ); // white
	light.position.set( - 1, - 1, - 1 );
	scene.add( light );
	var light = new THREE.AmbientLight( 0x222222 ); //black
	scene.add( light );
	// remove old entries from dat.GUI
	gui.destroy();
	//init new dat.gui
	gui = new dat.GUI( { autoplace: false, width: 320 }); // initialize fixed width 320
	loadedGeometryColorTab = gui.addFolder('COLOR LEGEND LOADED GEOMETRY');
	geometryTab = gui.addFolder('DOWNLOAD GEOMETRY');
	notLoadedTab = gui.addFolder('NOT LOADED GEOMETRY');
	// open every tab by default
	loadedGeometryColorTab.open();
	geometryTab.open();
	notLoadedTab.open();
	// update view of active query
	queryButton.addEventListener('click', function() { renderQuery(query); });
	// send request to triplestore with selected query
	const body = {
		query: query,
		infer: false, // queries do not need reasoning
	};
	const options = {
		method: 'POST',
		headers:headers,
		body:JSON_to_URLEncoded(body), // turn JSON body into x-www-form-urlencoded
	};
	fetchPromise(URL_GRAPHDB,options);
}

//////////////////////////////////////////////////////////////////////////////////////
// functions: view query on screen
//////////////////////////////////////////////////////////////////////////////////////

// function to view query on screen
function renderQuery(q) {
	floatingDiv.style.display = 'block';
	var queryHtml = q.split('<' ).join( '&lt'); //specific HTML sign for '<' in prefixes
	queryHtml = queryHtml.split('>' ).join( '&gt'); //specific HTML sign for '>' in prefixes
	queryHtml = queryHtml.split( '\n' ).join( '<br />' );
	queryHtml = queryHtml.split( '\t' ).join( '&nbsp&nbsp&nbsp&nbsp&nbsp' ); //5 spaces replace a tab
	floatingDiv.innerHTML = queryHtml ;
}

// function to close window with query if clicked outside the screen
function onWindowClick( event ) {
	var needToClose = true;
	var target = event.target;
	while( target !== null ) {
		if ( target === floatingDiv || target === queryButton || target === queryButton1 || target === queryButton2 || target === queryButton3 ) {
			needToClose = false;
			break;
		}
		target = target.parentElement;
	}
	if ( needToClose ) {
		floatingDiv.style.display = 'none';
	}
}

//////////////////////////////////////////////////////////////////////////////////////
// functions: geometry FILE loaders - RDF literals containing reference to external file
//////////////////////////////////////////////////////////////////////////////////////

// function for loading gltf geometry
function loadThisGLTF( pathToJSON, color ){
	var loader = new THREE.GLTFLoader();
	loader.load(
		pathToJSON,
		function ( gltf ) { //object to gltf
			// set colored material
			gltf.scene.traverse(function(child){
				if (child instanceof THREE.Mesh){
					child.material = new THREE.MeshStandardMaterial( { color: color } ); //blue (glb) or red (gltf)
				}
			});
			// translate to a place closer to the origin
			gltf.scene.translateX(-45);
			gltf.scene.translateY(-15);
			gltf.scene.translateZ(15);
			// add to scene
			scene.add( gltf.scene );
			console.log("GLTF/GLB loaded");
		},
		// onProgress callback
		function ( xhr ) { console.log( (xhr.loaded / xhr.total * 100) + '% loaded' ); },
		// onError callback
		function( err ) { console.log( 'An error happened' ); }
	)
};

// function for loading OBJ geometry - export from Rhino as mesh (nurbs cannot be read) + OBJ without mtl can be read
function loadThisOBJ( pathToOBJ, color ){
	var loader = new THREE.OBJLoader();
	loader.load(
		pathToOBJ,
		function ( objFile ) {
			// set colored material
			objFile.traverse( function ( child ) {
				if (child.isMesh){
					child.material = new THREE.MeshStandardMaterial( { color: color} ); //green
				}
			});
			// translate to a place closer to the origin
			objFile.translateX(-45);
			objFile.translateY(-15);
			objFile.translateZ(15);
			// add to scene
			scene.add( objFile );
			console.log("OBJ loaded");
		},
		// onProgress callback
		function ( xhr ) { console.log( (xhr.loaded / xhr.total * 100) + '% loaded' ); },
		// onError callback
		function( err ) { console.log( 'An error happened' ); }
	)
};

// function for loading COLLADA geometry
function loadThisCollada( pathToCollada, color ){
	var loader = new THREE.ColladaLoader();
	loader.load(
		pathToCollada,
		function ( colladaFile ) {
			// set colored material
			colladaFile.scene.traverse( function ( child ) {
				if (child.isMesh){
					child.material = new THREE.MeshStandardMaterial( { color: color } ); //purple
				}
			});
			// translate to a place closer to the origin
			colladaFile.scene.translateX(-45);
			colladaFile.scene.translateY(-15); // Collada export from Rhino: Y = negative threejs Z
			colladaFile.scene.translateZ(-15); // Collada export from Rhino: Z = threejs Y (up-axis)
			// add to scene
			scene.add( colladaFile.scene );
			console.log("COLLADA loaded");
		},
		// onProgress callback
		function ( xhr ) { console.log( (xhr.loaded / xhr.total * 100) + '% loaded' ); },
		// onError callback
		function( err ) { console.log( 'An error happened' ); }
	)
};

// function for loading PLY (incl point cloud) geometry - fails to properly load PCs (looks like mesh + very high GPU)
function loadThisPLY( pathToPLY, color ){
	var loader = new THREE.PLYLoader();
	loader.load(
		pathToPLY,
		function ( plyGeometry ) {
			// create mesh with colored material
			var plyMaterial = new THREE.MeshStandardMaterial( { color: color } ); // cyan (ascii ply) or orange (binaryLE) // PLY does not contain material
			var plyMesh = new THREE.Mesh ( plyGeometry, plyMaterial );
			// translate to a place closer to the origin
			plyMesh.translateX(-45);
			plyMesh.translateY(-15);
			plyMesh.translateZ(15);
			plyMesh.rotateX(-Math.PI/2); // all PLY models have to be rotated 90° around x axis if coming from MeshLab
			// add to scene
			scene.add( plyMesh );
			console.log("PLY loaded");
		},
		// onProgress callback
		function ( xhr ) { console.log( (xhr.loaded / xhr.total * 100) + '% loaded' ); },
		// onError callback
		function( err ) { console.log( 'An error happened' ); }
	)
};

//////////////////////////////////////////////////////////////////////////////////////
// functions: geometry STRING loaders - from RDF literals containing embedded geometry
//////////////////////////////////////////////////////////////////////////////////////

// function for loading OBJ geometry from STRING - export from Rhino as mesh (nurbs cannot be read)
function loadThisOBJString( data , color ){
	var loader = new THREE.OBJLoader();
	myObject = loader.parse(data);
	// set colored material
	myObject.traverse( function ( child ) {
		if (child.isMesh){
			child.material = new THREE.MeshStandardMaterial( { color: color} ); //green
		}
	});
	// translate to a place closer to the origin
	myObject.translateX(-45);
	myObject.translateY(-15);
	myObject.translateZ(15);
	// add to scene
	scene.add(myObject);
	console.log("OBJ loaded from string");
};

function loadThisPLYString( data , color ){
	var loader = new THREE.PLYLoader();
	plyGeometry = loader.parse(data);
	var plyMaterial = new THREE.MeshStandardMaterial( { color: color } ); //orange (binaryLE) or cyan (ascii) // PLY does not contain material
	var plyMesh = new THREE.Mesh ( plyGeometry , plyMaterial );
	// translate to a place closer to the origin
	plyMesh.translateX(-45);
	plyMesh.translateY(-15);
	plyMesh.translateZ(15);
	plyMesh.rotateX(-Math.PI/2); // all PLY models have to be rotated 90° around x axis if coming from MeshLab
	// add to scene
	scene.add(plyMesh);
	console.log("PLY loaded from string");
}

function loadThisGltfString ( data , color ){
	var loader = new THREE.GLTFLoader();
	loader.parse(data , '', ( gltf ) => {
		// set colored material
		gltf.scene.traverse(function(child){
			if (child instanceof THREE.Mesh){
				child.material = new THREE.MeshStandardMaterial( { color: color } ); //red (gltf) or blue (glb)
			}
		});
		// translate to a place closer to the origin
		gltf.scene.translateX(-45);
		gltf.scene.translateY(-15);
		gltf.scene.translateZ(15);
		// add to scene
		scene.add (gltf.scene);
	});
	console.log("GLTF/GLB loaded from string");
};