//////////////////////////////////////////////////////////////////////////////////////
// Initalizing global variables: queries + Linked Data sources + other
//////////////////////////////////////////////////////////////////////////////////////

// select all geometry (without reasoning)
const _queryAll = `
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX omg: <https://w3id.org/omg#>
PREFIX fog: <https://w3id.org/fog#>
PREFIX gom: <https://w3id.org/gom#>

SELECT ?elementOrZone ?geometryType ?geometry ?cs ?property ?value WHERE {
	?geometry ?property ?value .
	OPTIONAL { ?elementOrZone omg:hasGeometry ?geometry . }
	OPTIONAL { 
		?geometry a ?geometryType . 
		FILTER ( ?geometryType != omg:Geometry )
	}
	OPTIONAL { ?geometry gom:hasCoordinateSystem ?cs . }
	#?property rdfs:subPropertyOf* ?omgProp . # inefficient UNION needed as no reasoning is available and property paths syntax is not supported in Comunica
	{ 
		?property rdfs:subPropertyOf ?omgProp 
	} UNION {
		?property rdfs:subPropertyOf ?subProp1 .
		?subProp1 rdfs:subPropertyOf ?omgProp .
	} UNION {
		?property rdfs:subPropertyOf ?subProp1 .
		?subProp1 rdfs:subPropertyOf ?subProp2 .
		?subProp2 rdfs:subPropertyOf ?omgProp .
	}
	FILTER ( ?omgProp IN ( omg:hasSimpleGeometryDescription , omg:hasComplexGeometryDescription ) ) .
}`;

// select all geometry of supported geometry schemas (without reasoning)
const _querySupported = `
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX omg: <https://w3id.org/omg#>
PREFIX fog: <https://w3id.org/fog#>
PREFIX gom: <https://w3id.org/gom#>

SELECT ?elementOrZone ?geometry ?property ?geometryType ?cs ?value WHERE {
	?geometry ?property ?value .
	OPTIONAL { ?elementOrZone omg:hasGeometry ?geometry . }
	OPTIONAL { 
		?geometry a ?geometryType . 
		FILTER ( ?geometryType != omg:Geometry )
	}
	OPTIONAL { ?geometry gom:hasCoordinateSystem ?cs . }
	#FILTER ( ?property IN ( fog:asNexus_v4.2-nxz , fog:asGltf_v2.0-gltf , fog:asGltf_v2.0-glb , fog:asPly_v1.0-binaryLE , fog:asPly_v1.0-ascii , fog:asCollada_v1.4.1 , fog:asNexus_v4.2-nxs , fog:asObj_v3.0-obj , fog:asSvg_v1.1 , fog:asPcd_v0.7-ascii ) ) .
	FILTER ( ?property IN ( fog:asNexus_v4.2-nxz , fog:asGltf_v2.0-gltf , fog:asGltf_v2.0-glb , fog:asPly_v1.0-binaryLE , fog:asPly_v1.0-ascii , fog:asCollada_v1.4.1 , fog:asNexus_v4.2-nxs , fog:asObj_v3.0-obj , fog:asSvg_v1.1 , fog:asPcd_v0.7-ascii , fog:asGeomOntology , fog:asStep_ap214 , fog:asE57_v1.0 ) ) .
	#BIND ( DATATYPE ( ?value ) AS ?datatype )
}`;

// select all geometry of supported geometry schemas + with explicit size lower than 100 mb (without reasoning) // TODO: update query (see above query)
const _querySupported_SizeFiltered = `
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX omg: <https://w3id.org/omg#>
PREFIX fog: <https://w3id.org/fog#>
PREFIX gom: <https://w3id.org/gom#>

SELECT ?elementOrZone ?geometry ?property ?geometryType ?cs ?value WHERE {
	?geometry ?property ?value ;
		gom:hasFileSize ?size .
	OPTIONAL { ?elementOrZone omg:hasGeometry ?geometry . }
	OPTIONAL { 
		?geometry a ?geometryType . 
		FILTER ( ?geometryType != omg:Geometry )
	}
	OPTIONAL { ?geometry gom:hasCoordinateSystem ?cs . }
	FILTER ( ?size < 100000000 ) .
	FILTER ( ?property IN ( fog:asNexus_v4.2-nxz , fog:asGltf_v2.0-gltf , fog:asGltf_v2.0-glb , fog:asPly_v1.0-binaryLE , fog:asPly_v1.0-ascii , fog:asCollada_v1.4.1 , fog:asNexus_v4.2-nxs , fog:asObj_v3.0-obj , fog:asSvg_v1.1 , fog:asPcd_v0.7-ascii ) ) .
}`;

// select all geometry of supported geometry schemas + with explicit size lower than 100 mb OR unknown size (without reasoning)
const _querySupported_SizeFilteredAndUnknownSize = `
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX omg: <https://w3id.org/omg#>
PREFIX fog: <https://w3id.org/fog#>
PREFIX gom: <https://w3id.org/gom#>

SELECT ?elementOrZone ?geometry ?property ?geometryType ?cs ?value WHERE {
	?geometry ?property ?value .
	OPTIONAL { ?elementOrZone omg:hasGeometry ?geometry . }
	OPTIONAL { 
		?geometry a ?geometryType . 
		FILTER ( ?geometryType != omg:Geometry )
	}
	OPTIONAL { ?geometry gom:hasCoordinateSystem ?cs . }
	OPTIONAL { ?geometry gom:hasFileSize ?size . }
	FILTER ( !BOUND(?size) || ?size < 100000000 ) .
	FILTER ( ?property IN ( fog:asNexus_v4.2-nxz , fog:asGltf_v2.0-gltf , fog:asGltf_v2.0-glb , fog:asPly_v1.0-binaryLE , fog:asPly_v1.0-ascii , fog:asCollada_v1.4.1 , fog:asNexus_v4.2-nxs , fog:asObj_v3.0-obj , fog:asSvg_v1.1 , fog:asPcd_v0.7-ascii ) ) .
}`;

// query to find the named CS of all geometry (without reasoning)
const _queryCSAllNamed = `
PREFIX gom: <https://w3id.org/gom#>

SELECT DISTINCT ?cs ?to ?matrix WHERE {
	?cs a gom:CartesianCoordinateSystem .
	OPTIONAL {
		?transformation gom:fromCartesianCoordinateSystem ?cs ;
			gom:toCartesianCoordinateSystem ?to ;
			gom:hasTransformationMatrix ?matrix .
	}
}`;

// query to find if geometry without named CS exists (without reasoning)
const _queryCSUnnamed = `
PREFIX gom: <https://w3id.org/gom#> 
PREFIX omg: <https://w3id.org/omg#> 

ASK WHERE {
	?geometry a omg:Geometry . 
	FILTER NOT EXISTS { ?geometry gom:hasCoordinateSystem ?cs } .
}`;

// initialize global variables
//coordinate systems
var cs = [
	// {
	//     	csName: 'CS name', // shortened URI of CS
	//     	transformationsTo: [
	// 			{
	//				csName: 'name of other CS',
	// 				transformationMatrix: THREE.js transformation matrix object,
	// 				inverse: true
	//			}
	// 		]
	// }
];

//geometry loaded by threejs
var loadedGeometry = [
	// {
	//  elementOrZoneUri: 'http://...', // optional
	// 	geometryUri: 'http://...',
	// 	originalCS: 'http://...', // or 'unnamed CS'
	// 	currentCS: 'http://...', // or 'unnamed CS'
	//  fogProp: 'https://w3id.org/fog#asObj_v3.0-obj',
	//  datatype: 'http://www.w3.org/2001/XMLSchema#base64Binary',
	//  geometryType: 'https://w3id.org/gom#Mesh', // optional
	//  downloadButton: HTMLObjectElement
	// }
]
var notLoadedGeometry = []; // same content as loadedGeometry except

var lastActiveCS; // last selected CS via UI
var hideAllExceptNexus = true; //init for hide function keyboard

// shorten URIs with prefixes
var listOfPrefixes = [
	{
		prefix: 'inst',
		namespace: 'https://example.org/snk/20190918/data#'
	},
	{
		prefix: 'epsg',
		namespace: 'http://www.opengis.net/def/crs/EPSG/0/'
	},
	{
		prefix: 'fog',
		namespace: 'https://w3id.org/fog#'
	},
	{
		prefix: 'omg',
		namespace: 'https://w3id.org/omg#'
	},
	{
		prefix: 'gom',
		namespace: 'https://w3id.org/gom#'
	},
	{
		prefix: 'xsd',
		namespace: 'http://www.w3.org/2001/XMLSchema#'
	}
];
// shorten unkown URIs by own prefix (ns + nr)
var prefixNr = 0;

// initialize Comunica query engine
const queryEngine = Comunica.newEngine();

// default start sources
var dropdownSources = [ 
	{ name: 'columns geometry' , sourceType: 'file' , value: 'https://raw.githubusercontent.com/mathib/fog-ontology/master/examples/sample_abox_columns.ttl' , online: true } , //columns Gravensteen
	{ name: 'contractor geometry' , sourceType: 'file' , value: 'https://raw.githubusercontent.com/mathib/fog-ontology/master/examples/sample_abox_snk_contractor.ttl' , online: true } , //SnK part contractor
	{ name: 'inspector geometry' , sourceType: 'file' , value: 'https://raw.githubusercontent.com/mathib/fog-ontology/master/examples/sample_abox_snk_inspector.ttl' , online: true } , //SnK part inspector
	// { name: 'local TPF columns' , sourceType: 'hypermedia' , value: 'http://localhost:3000/columns.ttl' , online: true } , // local TPF
	// { name: 'local TPF contractor' , sourceType: 'hypermedia' , value: 'http://localhost:3000/contractor.ttl' , online: true } , // local TPF
	// { name: 'local TPF inspector' , sourceType: 'hypermedia' , value: 'http://localhost:3000/inspector.ttl' , online: true } , // local TPF
	// { name: 'FOG ontology file' , sourceType: 'file' , value: 'https://w3id.org/fog/fog.ttl' , online: true  } , // needed if using query _queryAll
];

// set Z-axis as default up
THREE.Object3D.DefaultUp.set( 0 , 0 , 1 );

// initialize dropdown sources
createDropdownSourcesSelect();
selectAllDropdownSources();
// initialize dropdown CS
var onlineSelectedSources = getSelectedSources();
queryComunicaCS( onlineSelectedSources );
queryComunicaGeometryWithoutCS( onlineSelectedSources );
// initialize query renders
createQueryRender();

//////////////////////////////////////////////////////////////////////////////////////
// Setup three.js scene + camera + renderer + controls
//////////////////////////////////////////////////////////////////////////////////////

// Create an empty scene
var scene = new THREE.Scene();
scene.background = new THREE.Color( 0xffffff );

// Create a basic perspective camera
var camera = new THREE.PerspectiveCamera( 10 , window.innerWidth/window.innerHeight , 1 , 5000 );
camera.position.set( -500 , -500 , 500 ); //vector of camera (viewdirection from this point to origin)

// Create a renderer with Antialiasing
var renderer = new THREE.WebGLRenderer( { antialias:true } );
// Configure renderer clear color
renderer.setClearColor( '#000000' );
// Configure renderer size
renderer.setSize( window.innerWidth , window.innerHeight );

renderer.setPixelRatio( window.devicePixelRatio );
// Append Renderer to DOM
document.body.appendChild( renderer.domElement );

//listen to keypresses
window.addEventListener( 'keypress' , keyboard );

//////////////////////////////////////////////////////////////////////////////////////
// HTML buttons
//////////////////////////////////////////////////////////////////////////////////////

// HTML element - downloading geometry (used for downloading geometry?)
var link = document.createElement( 'a' );
link.style.display = 'none';
document.body.appendChild( link );

// start loading animation // source: https://spin.js.org/
var target = document.getElementById( 'spinner' );
var spinner1 = new Spinner( { color:'#000000', lines: 12 , scale: 3 } ).spin( target ); // init and start spinner (query)
spinner1.stop(); // we only want to start it when someone hits 'query'

//////////////////////////////////////////////////////////////////////////////////////
// alternative 3D controls - trackball
//////////////////////////////////////////////////////////////////////////////////////

var controls = new THREE.TrackballControls( camera , renderer.domElement ); // alternative is OrbitControls
controls.rotateSpeed = 5.0;
controls.zoomSpeed = 3.2;
controls.panSpeed = 0.1;
controls.noZoom = false;
controls.noPan = false;
controls.staticMoving = false;
controls.dynamicDampingFactor = 0.2;
controls.addEventListener( 'change', function() { redraw = true; } );

//////////////////////////////////////////////////////////////////////////////////////
// Additional three.js features: axis + lights + gridhelper
//////////////////////////////////////////////////////////////////////////////////////

// add axis to scene
var axisHelper = new THREE.AxesHelper( 15 ); // X (red) // Y (green) // Z (blue)
scene.add( axisHelper );

// gridhelper
var gridHelperXZ = new THREE.GridHelper( 10 , 10 );
var gridHelperXY = gridHelperXZ.clone();
gridHelperXY.rotateX(-Math.PI/2);
scene.add( gridHelperXY );

// lights
var light1 = new THREE.DirectionalLight( 0xffffff, 1.0 );
light1.position.set( 1, 1, -1 );
scene.add( light1 );

var light2 = new THREE.DirectionalLight( 0xffffff, 1.0 );
light2.position.set( -1, -1, 1 );
scene.add( light2 );

var light = new THREE.AmbientLight( 0x222222 ); //black
scene.add( light );

//////////////////////////////////////////////////////////////////////////////////////
// Arrays of IDs of objects (numbers)
//////////////////////////////////////////////////////////////////////////////////////

var arrayPC_IDs = []; // quick access to loaded point clouds (TODO replace by metadata in-memory triplestore)
var arrayNexusBB_IDs = []; // access to each Nexus obj and its resp. boundingbox (TODO replace by metadata in-memory triplestore)

//////////////////////////////////////////////////////////////////////////////////////
// start animation
//////////////////////////////////////////////////////////////////////////////////////

var redraw = true;
window.addEventListener( 'resize' , onWindowResize , false );

animationLoop();

// initialize clipping plane
createClippingPlane(); // parallel to XZ plane

openNav( 'introNav' );

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////
// functions: general
//////////////////////////////////////////////////////////////////////////////////////

// dynamic animationLoop - needed when working with controls
function animationLoop() {
	requestAnimationFrame( animationLoop );
	controls.update();
	// update if something changes in the visibility settings of the scene (material, size, hide/show, ...)
	renderer.render( scene , camera );
	camera.lookAt ( scene.position );
}

// adjust camera, controls and renderer on windowsresize
function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth , window.innerHeight );

	controls.handleResize();
	controls.update();
	renderer.render( scene , camera );
}

// create clipping plane
function createClippingPlane(){
	var globalPlane = new THREE.Plane( new THREE.Vector3( 0 , -1 , 0 ) , 105 );
	var globalPlanes = [ globalPlane ] , Empty = Object.freeze( [] );
	renderer.clippingPlanes = globalPlanes; // GUI sets it to globalPlanes
	renderer.localClippingEnabled = true; 

	var gui2 = new dat.GUI(),
		folderGlobal = gui2.addFolder( 'Global Clipping' ),
		propsGlobal = {
			get 'Enabled'() {
				return renderer.clippingPlanes !== Empty;
			},
			set 'Enabled'( v ) {
				renderer.clippingPlanes = v ? globalPlanes : Empty;
			},
			get 'Plane'() {
				return globalPlane.constant;
			},
			set 'Plane'( v ) {
				globalPlane.constant = v;
			}
		};
	folderGlobal.add( propsGlobal , 'Enabled' ).listen(); 
	folderGlobal.add( propsGlobal , 'Plane' , 0 , 200 );
	// set disabled by default
	propsGlobal.Enabled = false;
	// TODO: set plane extends based on combined bounding box of visible geometry
	// TODO: multiple clipping planes => bounding box
}

// function to treat geometry accordingly to its datatype + provide download button
function decodeGeometry( element ){
	// bind variables
	if ( element['?elementOrZone'] == null ){ // optional: building element or zone URI
		var e = '';
	} else {
		var e = element['?elementOrZone'].value;
	}
	var g = element['?geometry'].value; // geometry node URI
	var p = element['?property'].value; // FOG property URI
	var v = element['?value'].value; // geometry description content
	if ( element['?value'].datatypeString == null ){ // datatype variable IS UNDEFINED in case of node instead of RDF literal (RDF-based geometry)
		var d = '';
	} else {
		var d = element['?value'].datatypeString;
	}
	if ( element['?cs'] == null ){ // if a geometry does not have a coordinate system assigned, it is assumed to be in an unnamed coordinate system
		var c = 'unnamed Coordinate System'; // original CS URI
	} else {
		var c = element['?cs'].value; // original CS URI
	}
	if ( element['?geometryType'] == null ){ // optional: geometry type URI (mesh, point cloud, etc.)
		var t = '';
	} else {
		var t = element['?geometryType'].value;
	}
	var geometryInfo = {
		elementOrZoneUri: e, // optional
		geometryUri: g,
		originalCS: c, // CS instance URI or 'unnamed CS'
		currentCS: c, // CS instance URI or 'unnamed CS'
		fogProp: p,
		datatype: d,
		geometryType: t, // optional
	}
	// selected decoder depends on datatype
	switch ( d ){
		case 'http://www.w3.org/2001/XMLSchema#anyURI':
			var fileLoc = v;
			if ( v.includes( 'github.com' ) ){ // modify regular Github link to raw Github link
				fileLoc = fileLoc.replace( 'github.com' , 'raw.githubusercontent.com' );
				fileLoc = fileLoc.replace( 'blob/' , '' );
			} else if ( v.includes( 'dropbox.com' ) ){ // modify regular Dropbox link to raw Dropbox link
				fileLoc = fileLoc.replace( 'dropbox.com' , 'dl.dropboxusercontent.com' );
			}
			switchGeometryType( geometryInfo , fileLoc );
			break;
		case 'http://www.w3.org/2001/XMLSchema#hexBinary':
			// decode hex binary // source: https://github.com/michalbe/binascii/blob/master/index.js
			var str = v;
			var binary_string = '';
			for ( var i = 0 , l = str.length ; i < l ; i += 2 ) {
				binary_string += String.fromCharCode( parseInt( str.substr( i , 2 ) , 16 ) );
			}
			switchGeometryType( geometryInfo , binary_string );
			break;
		case 'http://www.w3.org/2001/XMLSchema#base64Binary':
			// decode base64 binary
			var binary_string =  window.atob( v );
			switchGeometryType( geometryInfo , binary_string );
			break;
		case 'http://www.w3.org/2001/XMLSchema#string':
			// escape newlines => not needed
			// escape quotes => not needed
			switchGeometryType( geometryInfo , v );
			break;
		case '': // no encoding => URI => RDF-based geometry
			switchGeometryType( geometryInfo );
			break;
		default: // existing but unknown binary encoding
			alert( 'Failed to load geometry format ' + p + ' with unknown binary encoding: ' + d );
	}
}

// function to transform binary string to bytes
function binaryStringToArraybuffer( binary_string ){
	var len = binary_string.length;
	var bytes = new Uint8Array( len );
	for ( var i = 0 ; i < len ; i++ ) {
		bytes[i] = binary_string.charCodeAt( i );
	}
	return bytes;
}

// function connecting FOG datatype property (geometry format) to corresponding three.js loader
function switchGeometryType( geometryInfo , vPrepared ){
	switch ( geometryInfo.fogProp ) {
		case 'https://w3id.org/fog#asDwg_v2018':
			if ( geometryInfo.datatype == 'http://www.w3.org/2001/XMLSchema#anyURI' ) {
				geometryInfo.downloadFunc = function() { window.open( vPrepared , '_blank' ); };
				notLoadedGeometry.push( geometryInfo );
			} else { // RDF literal containing encoded binary data
				geometryInfo.downloadFunc = function() { alert( 'Download function is currently not implemented' ); };
				notLoadedGeometry.push( geometryInfo );
			}
			break;
		case 'https://w3id.org/fog#asNexus_v4.2-nxs':
		case 'https://w3id.org/fog#asNexus_v4.2-nxz':
			if ( geometryInfo.datatype == 'http://www.w3.org/2001/XMLSchema#anyURI' ) {
				geometryInfo.downloadFunc = function() { window.open( vPrepared , '_blank' ) }
				loadThisNexus( geometryInfo , vPrepared );
			} else { // RDF literal containing encoded binary data
				// binary string to bytes
				//var bytes = binaryStringToArraybuffer( vPrepared );
				// feed the loader the arraybuffer
				//loadThisNexusString( geometryInfo , bytes.buffer ); // not yet implemented
				geometryInfo.downloadFunc = function() { alert( 'Download function is currently not implemented for Nexus geometry stored inside a literal' ); };
				//not tested
				// if (p == "https://w3id.org/fog#asNexus_v4.2-nxz"){
				// 	geometryInfo.downloadFunc = function() { saveBinary( escape( vPrepared ) , 'nexus-binaryFile.nxz' ) };
				// } else { //NXS file
				// 	geometryInfo.downloadFunc = function() { saveBinary( escape( vPrepared ) , 'nexus-binaryFile.nxs' ) };
				// }
				notLoadedGeometry.push( geometryInfo );
			}
			break;
		case 'https://w3id.org/fog#asSvg_v1.1':
			if ( geometryInfo.datatype == 'http://www.w3.org/2001/XMLSchema#anyURI' ){
				var downloadFunc = function() {
					fetch( vPrepared ).then( response => { 
						return response.text(); // return raw text instead of JSON with ReadableStream 
					}).then( text_string => {
						saveString( text_string , 'svgFile.svg' );
					})
				}
				geometryInfo.downloadFunc = downloadFunc;
				loadThisSVG( geometryInfo , vPrepared );
			} 
			else {
				//three.js somehow fails to load SVG from a string
				geometryInfo.downloadFunc = function() { saveString( vPrepared , 'svgFile.svg' ) };
				notLoadedGeometry.push( geometryInfo );
			}
			break;
		case 'https://w3id.org/fog#asCollada_v1.4.1':
			if ( geometryInfo.datatype == 'http://www.w3.org/2001/XMLSchema#anyURI' ){
				var downloadFunc = function() {
					fetch( vPrepared ).then( response => { 
						return response.text(); // return raw text instead of JSON with ReadableStream 
					}).then( text_string => {
						saveString( text_string , 'colladaFile.dae' );
					})
				}
				geometryInfo.downloadFunc = downloadFunc;
				loadThisCollada( geometryInfo , vPrepared );
			} else {
				//three.js somehow fails to load Collada from a string
				geometryInfo.downloadFunc = function() { saveString( vPrepared , 'colladaFile.dae' ) };
				notLoadedGeometry.push( geometryInfo );
			}
			break;
		case 'https://w3id.org/fog#asObj_v3.0-obj':
			if ( geometryInfo.datatype == 'http://www.w3.org/2001/XMLSchema#anyURI'){
				// create download button in GUI
				var downloadFunc = function() {
					fetch( vPrepared ).then( response => { 
						return response.text(); // return raw text instead of JSON with ReadableStream 
					}).then( text_string => {
						saveString( text_string , 'objFile.obj' );
					})
				};
				geometryInfo.downloadFunc = downloadFunc;
				loadThisOBJ( geometryInfo , vPrepared );
			} else {
				geometryInfo.downloadFunc = function() { saveString( vPrepared , 'objFile.obj' ) };
				loadThisOBJString( geometryInfo , vPrepared );
			}
			break;
		case 'https://w3id.org/fog#asPcd_v0.7-ascii':
			if ( geometryInfo.datatype == 'http://www.w3.org/2001/XMLSchema#anyURI' ){
				var downloadFunc = function() {
					fetch( vPrepared ).then( response => { 
						return response.text(); // return raw text instead of JSON with ReadableStream 
					}).then( text_string => {
						saveString( text_string , 'pcd-asciiFile.pcd' );
					})
				};
				geometryInfo.downloadFunc = downloadFunc;
				loadThisPCD( geometryInfo , vPrepared );
			} else {
				geometryInfo.downloadFunc = function() { saveString( vPrepared , 'pcd-asciiFile.pcd' ) };
				notLoadedGeometry.push( geometryInfo );
				// loadThisPCDString( geometryInfo , vPrepared ); // not yet implemented
			}
			break;
		case 'https://w3id.org/fog#asPly_v1.0-ascii':
			var colorPlyAscii = new THREE.Color( 0x00ffff ); //cyan 
			if ( geometryInfo.datatype == 'http://www.w3.org/2001/XMLSchema#anyURI' ){
				// create download button in GUI
				var downloadFunc = function() {
					fetch( vPrepared ).then( response => { 
						return response.text(); // return raw text instead of JSON with ReadableStream 
					}).then( text_string => {
						saveString( text_string , 'ply-asciiFile.ply' );
					})
				};
				geometryInfo.downloadFunc = downloadFunc;
				loadThisPLY( geometryInfo , vPrepared , colorPlyAscii );
			} else {
				geometryInfo.downloadFunc = function() { saveString( vPrepared , 'ply-asciiFile.ply' ) };
				loadThisPLYString( geometryInfo , vPrepared , colorPlyAscii );
			}
			break;
		case 'https://w3id.org/fog#asPly_v1.0-binaryLE':
			var colorPlyBinary = new THREE.Color( 0xC0C0C0 ); //grey 
			if ( geometryInfo.datatype == 'http://www.w3.org/2001/XMLSchema#anyURI' ) {
				geometryInfo.downloadFunc = function() { window.open( vPrepared , '_blank' ) };
				loadThisPLY( geometryInfo , vPrepared , colorPlyBinary );
			} else { // RDF literal containing encoded binary data
				// binary string to bytes
				var bytes = binaryStringToArraybuffer( vPrepared );
				geometryInfo.downloadFunc = function() { saveBinary( escape( vPrepared ) , 'ply-binaryFile.ply' ) };
				// feed the loader the arraybuffer
				loadThisPLYString( geometryInfo , bytes.buffer , colorPlyBinary );
			}
			break;
		case 'https://w3id.org/fog#asGltf_v2.0-glb':
			var colorGlb = new THREE.Color( 0x0000FF ); //blue
			if ( geometryInfo.datatype == 'http://www.w3.org/2001/XMLSchema#anyURI' ){
				geometryInfo.downloadFunc = function() { window.open( vPrepared , '_blank' ) };
				loadThisGLTF( geometryInfo , vPrepared , colorGlb );
			} else { // RDF literal containing encoded binary data
				// binary string to bytes
				var bytes = binaryStringToArraybuffer( vPrepared );
				geometryInfo.downloadFunc = function() { saveBinary( escape( vPrepared ) , 'glbFile.glb' ) }
				// feed the loader the arraybuffer
				loadThisGltfString( geometryInfo , bytes.buffer , colorGlb );
			}
			break;
		case 'https://w3id.org/fog#asGltf_v2.0-gltf': // expects gltf (JSON) with embedded geometry and textures
			var colorGltf = new THREE.Color( 0xff0000 ); //red
			if ( geometryInfo.datatype == 'http://www.w3.org/2001/XMLSchema#anyURI' ){
				geometryInfo.downloadFunc = function() { window.open( vPrepared , '_blank' ) };
				loadThisGLTF( geometryInfo , vPrepared , colorGltf );
			} else {
				geometryInfo.downloadFunc = function() { saveString( vPrepared , 'gltfFile.gltf' ) };
				loadThisGltfString( geometryInfo , vPrepared , colorGltf );
			}
			break;
		case 'https://w3id.org/fog#_ap214':
			// no loader available in three.js for STEP
			geometryInfo.downloadFunc = function() { saveString( vPrepared , 'stepFile.stp' ) };
			notLoadedGeometry.push( geometryInfo );
			break;
		case 'https://w3id.org/fog#asE57_v1.0':
			// no loader available in three.js for e57
			geometryInfo.downloadFunc = function() { window.open( vPrepared , '_blank' ) };
			notLoadedGeometry.push( geometryInfo );
			break;
		case "https://w3id.org/fog#asGeomOntology":
			// no loader available in three.js for GEOM RDF-based geometry
			geometryInfo.downloadFunc = function() { alert( 'Download function is currently not implemented for GEOM ontology-based geometry' ) };
			notLoadedGeometry.push( geometryInfo );
			break;
		default: 
			// no loader available in three.js or not yet prepared in above code
			switch( geometryInfo.datatype ){
				case 'http://www.w3.org/2001/XMLSchema#anyURI':
					// only works for xsd:anyURI if binary (not if ascii => directly to raw page)
					geometryInfo.downloadFunc = function() { window.open( vPrepared , '_blank' ) };
					notLoadedGeometry.push( geometryInfo );
					break;
				case 'http://www.w3.org/2001/XMLSchema#string':
					geometryInfo.downloadFunc = function() { saveString( vPrepared , 'geometryFile.txt' ) };
					notLoadedGeometry.push( geometryInfo );
					break;
				case 'http://www.w3.org/2001/XMLSchema#base64Binary':
				case 'http://www.w3.org/2001/XMLSchema#hexBinary':
					geometryInfo.downloadFunc = function() { saveBinary( escape( vPrepared ) , 'geometryFile.bin' ) };
					notLoadedGeometry.push( geometryInfo );
					break;
			};
	};
}

// function helping with saving to text file
function saveString( text , filename ) {
	var blob = new Blob( [ text ] , { type: 'text/plain' } );
	link.href = URL.createObjectURL( blob );
	link.download = filename;
	link.click();
}

// function for helping with saving binary files
function saveBinary( data , filename ) {
	link.href = "data:application/plain;charset=utf-8," + data;
	link.download = filename;
	link.click();
}

// function to control visualization with keyboard entries
function keyboard( ev ) {
	const e = ev.key || String.fromCharCode( ev.keyCode || ev.charCode );
	switch ( e ){
		// all pointclouds in scene
		case '+':
			for ( var i = 0 ; i < arrayPC_IDs.length ; i++ ){ // get all loaded point clouds
				var pc = scene.getObjectById( arrayPC_IDs[i] );
				pc.material.size *= 1.5;
				pc.material.needsUpdate = true;
			}
			break;
		case '-':
			for ( var i = 0 ; i < arrayPC_IDs.length ; i++ ){ // get all loaded point clouds
				var pc = scene.getObjectById( arrayPC_IDs[i] );
				pc.material.size /= 1.5;
				pc.material.needsUpdate = true;
			}
			break;
		case 'e': //zoom extend
			zoomToLoaded( loadedGeometry );
			break;
		case 'u'://set vertical Z-up for trackball
			controls.object.up = new THREE.Vector3( 0 , 0 , 1 );
			break;
		case 'h': 
			if ( hideAllExceptNexus ){ //hide all except nexus // TODO: for some reason it also hides the clippingplane gui
				for ( var i = 0 ; i < loadedGeometry.length ; i++ ){
					var geometryObject = scene.getObjectByName( loadedGeometry[i].geometryUri );
					var isNexusGeom = false;
					for ( var j = 0 ; j < arrayNexusBB_IDs.length ; j++ ){ //do not hide if Nexus geometry
						if ( geometryObject.id == arrayNexusBB_IDs[j][1] ){
							isNexusGeom = true;
							break;
						}
					}
					if ( !isNexusGeom ){ // non-Nexus geometry can be hided
						geometryObject.visible = false;
					}
				}
			} else { // unhide all geometry in active CS (current CS = active CS)
				for ( var i = 0 ; i < loadedGeometry.length ; i++ ){
					if ( loadedGeometry[i].currentCS == lastActiveCS ){
						var geometryObject = scene.getObjectByName( loadedGeometry[i].geometryUri );
						geometryObject.visible = true;
					}
				}
			}
			hideAllExceptNexus = !hideAllExceptNexus;
			break;
	}
}

function hideShowSelectedGeometry( geometryUri ){
	var geometryObject = scene.getObjectByName( geometryUri );
	if ( geometryObject.visible == false ){
		for ( var i = 0 ; i < loadedGeometry.length ; i++ ){
			// only show back if the currentCS of the geometry is the same as the activeCS
			if ( ( loadedGeometry[i].geometryUri == geometryUri ) && ( loadedGeometry[i].currentCS == lastActiveCS ) ){ 
				geometryObject.visible = true;
			}
		}
	} else {
		geometryObject.visible = false;
	}
}

function zoomToLoaded( geometries ) {
	var selection = [];
	for ( var i = 0 ; i < geometries.length ; i++ ){
		var geom = scene.getObjectByName( geometries[i].geometryUri );
		// var isNexusGeom = false;
		if ( geom.visible == true ){
			for ( var j = 0 ; j < arrayNexusBB_IDs.length ; j++ ){ //filter out Nexus geometry and replace by its bounding box
				var isNexusGeom = false;
				if ( geom.id == arrayNexusBB_IDs[j][1] ){
					selection.push( scene.getObjectById( arrayNexusBB_IDs[j][0] ) ); // push nexus BB / obj
					isNexusGeom = true;
				}
			}
			if ( !isNexusGeom ){ // non Nexus geometry can be pushed directly
				selection.push( geom );
			}
		}
	}
	if ( selection.length > 0 ) zoomCameraToSelection( camera , controls , selection );
}

// function to zoom camera to selected geometry - based on code: https://codepen.io/looeee/pen/vwVeZB.js // https://codepen.io/looeee/full/vwVeZB
function zoomCameraToSelection( camera , controls , selection , fitRatio = 1.2 ) {
	const box = new THREE.Box3(); //boundingbox
  
	for ( const object of selection ) box.expandByObject( object );
  
	const size = box.getSize( new THREE.Vector3() );
	const center = box.getCenter( new THREE.Vector3() );
  
	const maxSize = Math.max( size.x , size.y , size.z );
	const fitHeightDistance = maxSize / ( 2 * Math.atan( Math.PI * camera.fov / 360 ) );
	const fitWidthDistance = fitHeightDistance / camera.aspect;
	const distance = fitRatio * Math.max( fitHeightDistance , fitWidthDistance );
  
	const direction = controls.target.clone().
	sub( camera.position ).
	normalize().
	multiplyScalar( distance );
  
	controls.maxDistance = distance * 100;
	controls.target.copy( center );
  
	camera.near = distance / 100;
	camera.far = distance * 100;

	camera.updateProjectionMatrix();
  
	camera.position.copy( controls.target ).sub( direction );
  
	// added for trackball controls: set vertical up axis along Z-axis
	controls.object.up = new THREE.Vector3( 0 , 0 , 1 );
}

// function to switch from Y-up geometry to Z-up geometry
function toZup( mesh ){
	var transformationMatrix = new THREE.Matrix4();
	transformationMatrix.makeRotationZ( Math.PI / 2 );
	transformationMatrix.makeRotationX( Math.PI / 2 );
	mesh.applyMatrix( transformationMatrix );
}

//////////////////////////////////////////////////////////////////////////////////////
// functions: UI to manage Comunica sources
//////////////////////////////////////////////////////////////////////////////////////

function createDropdownSourcesSelect(){
	if ( dropdownSources.length > 0 ){
		var dropdownDatasets = document.getElementById( 'myDropdown' );
		var selectDatasets = document.createElement( 'select' ) ;
		selectDatasets.onchange = function() { 
			replaceCSDropdown();
		}; //on change: on every select/deselect
		selectDatasets.setAttribute( 'name' , 'source' );
		selectDatasets.setAttribute( 'class' , 'dropdown-select' ); // source
		selectDatasets.setAttribute( 'style' , 'width: 300px;' );
		selectDatasets.setAttribute( 'id' , 'datasource' );
		selectDatasets.setAttribute( 'multiple' , 'multiple' ); //boolean attribute
		for ( var i = 0 ; dropdownSources.length > i ; i++ ){
			var optionDataset = document.createElement( 'option' );
			optionDataset.setAttribute( 'value' , i ); //the array index
			optionDataset.setAttribute( 'title' , dropdownSources[i].value ); // add tooltip text (actual URL)
			optionDataset.setAttribute( 'class' , 'fa' );
			optionDataset.setAttribute( 'style' , 'display: block; font-size: 15px;' ); // overwrite fa class display: inline-block
			optionDataset.text += ' ' + dropdownSources[i].name + ' (' + dropdownSources[i].sourceType + ')';
			sourceOnline( dropdownSources[i] , optionDataset , i ); // check if the source is online
			optionDataset.innerHTML += ' &#xf00c;'; // default fa-icon for sources: check (online)
			selectDatasets.appendChild( optionDataset );
		}
		dropdownDatasets.appendChild( selectDatasets );
	} else { //no dropdownsources => delete cs list
		replaceCSDropdown();
	}
}

function selectAllDropdownSources(){
	var selectDatasets = document.getElementById( 'datasource' );
	for ( var i = 0 ; i < selectDatasets.length ; i++ ){
		selectDatasets[i].selected = true;
	}
}

// check if given comunica source is online with mini query
function sourceOnline( source , option , sourceIndex ){
	queryEngine
	.query( 'SELECT ?s WHERE { ?s ?p ?o } LIMIT 1' , { sources: [source] } )    
	.then( function ( result ) {
		result.bindingsStream.on( 'error', function( err ){
			// remove last two characters (default icon if online)
			option.text = option.text.substring( 0 , option.text.length - 2 );
			// add new character (other icon)
			option.innerHTML += ' &#xf071;'; // fa-icon: exclamation mark (not online)
			// update sources json
			dropdownSources[sourceIndex].online = false;
		});
	});         
}

// funtion to fill in new RDF comunica source
function addComunicaSource() {
	var inputName = document.getElementById( 'newDataSourceName' ).value;
	var input = document.getElementById( 'newDataSource' ).value;
	var inputType = document.getElementById( 'newDataSourceType' ).value;
	dropdownSources.push( { name: inputName , sourceType: inputType , value: input , online: true } );
	deleteDropdownSourcesSelect();
	createDropdownSourcesSelect();
	replaceCSDropdown();
}

// delete dropdown sources select
function deleteDropdownSourcesSelect(){
	var selectDatasets = document.getElementById( 'datasource' );
	if ( selectDatasets ){
		selectDatasets.remove();
	}
}

// remove selected option(s) from dropdown
function removeDropdownOptions(){
	var optIndexes = document.getElementById( 'datasource' ); //optIndex is the HTML object: array options
	var d = [];
	if ( optIndexes ){
		for ( var k = 0 ; optIndexes.length > k ; k++ ){
			if ( !optIndexes.options[k].selected ){
				d.push( dropdownSources[k] );
			}
		};
		dropdownSources = d;
		deleteDropdownSourcesSelect();
		createDropdownSourcesSelect(); 
		replaceCSDropdown();    
	}
}

//////////////////////////////////////////////////////////////////////////////////////
// functions: UI to manage CS
//////////////////////////////////////////////////////////////////////////////////////

function replaceCSDropdown(){ 
	// reset cs array object
	cs = [];
	// delete old anchors in dropdown-content
	var oldDropdownContent = document.getElementById( 'cs-dropdown' );
	while ( oldDropdownContent.firstChild ){
		oldDropdownContent.removeChild( oldDropdownContent.firstChild );
	}
	// reset dropdown button
	resetCSButton();
	// hide all geometry + undo transformations + set currentCS back to originalCS
	for ( var i = 0 ; i < loadedGeometry.length ; i++ ){
		var geometryObject = scene.getObjectByName( loadedGeometry[i].geometryUri );
		geometryObject.visible = false;
		// TODO: get transformation matrix from currentCS to originalCS
		// geometryObject.applyMatrix( transformationMatrix );
		loadedGeometry[i].currentCS = loadedGeometry[i].originalCS;
	}
	// query selected sources => calculate transformations => populate results in new dropdown content
	if ( dropdownSources.length > 0 ){
		var d = getSelectedSources();
		queryComunicaCS( d ); // selected online sources => named CSs
		queryComunicaGeometryWithoutCS( d ); // selected online sources => unnamed CS
	}
}

// retrieve array of selected sources
function getSelectedSources(){
	var optIndexes = document.getElementById( 'datasource' ); //optIndex is the HTML object: array options
	var d = [];
	for ( var k = 0 ; optIndexes.length > k ; k++ ){
		var optIndex = optIndexes.options[k].value;
		if ( ( optIndexes.options[k].selected ) && ( dropdownSources[optIndex].online == true ) ){ // if selected sources in UI and if source is online
			d.push( { type: dropdownSources[optIndex].sourceType , value: dropdownSources[optIndex].value } );
		}
	};
	return d;
}

function resetCSButton(){
	var csDropdownButton = document.getElementById( 'cs-dropdownbtn' );
	csDropdownButton.innerText = ''; // remove content of button: text and symbol
	var dropdownSymbol = document.createElement( 'i' );
	dropdownSymbol.setAttribute( 'class' , 'fa fa-caret-down' );
	dropdownSymbol.setAttribute( 'style' , 'font-size:20px;' );
	csDropdownButton.appendChild( dropdownSymbol );
	var newButtonText = document.createTextNode( '\u00A0\u00A0 ' + ' Select Coordinate System' );
	csDropdownButton.appendChild( newButtonText );
}

function queryComunicaCS( sources ){
	queryEngine
	.query( _queryCSAllNamed ,	{ sources: sources } )    
	.then( function ( result ) {
		result.bindingsStream.on( 'data', function ( data ) { // for every result (stream) do:
			var d = data.toObject();
			addToCSList( d ); // add CS data to JSON - calculate connections - render results continuously
		});
		result.bindingsStream.on( 'end' , () => { 
			calculateIndirectTransformations();
		});
		// somehow doesn't reacts
		// result.bindingsStream.on( 'error' , function( err ) {
		// 	console.error( err.message ) ;
		// });
	})
	// somehow doesn't reacts
	// .catch( ( err ) => {
	// 	console.log( 'general error launched (querycomunicacs)')
	// 	// check if unavailable sources => restart query
	// 	if ( err.message.includes( 'Error requesting ') || err.message.includes( 'Could not retrieve ' ) ){
	// 		var activeRdfSources = filterActiveSources( sources , err );
	// 		if ( activeRdfSources.length > 0 ){
	// 			queryComunicaCS( activeRdfSources );
	// 		}
	// 	}
	// });
}

async function queryComunicaGeometryWithoutCS( sources ){
	const result = await queryEngine
		.query( _queryCSUnnamed , { sources: sources } ) // ASK query: a geometry without CS exists?
		// somehow doesn't react
		// .catch( ( err ) => {
		// check if unavailable sources => restart query
		// 	if ( err.message.includes( 'Error requesting ' ) || err.message.includes( 'Could not retrieve ' ) ){
		// 		var activeRdfSources = filterActiveSources( sources , err );
		// 		if ( activeRdfSources.length > 0 ){
		// 			queryComunicaGeometryWithoutCS( activeRdfSources );
		// 		}
		// 	}
		// });
	if ( await result.booleanResult ){
		var dropdownCS = document.getElementById( 'cs-dropdown' );
		var optionCS = document.createElement( 'a' ); // workaround via anchor instead of select => reuse of dropdown-content style
		optionCS.setAttribute( 'id' , 'unnamed Coordinate System' ); // only the ID of the anchor can be retrieved
		optionCS.innerText = 'unnamed Coordinate System';
		optionCS.onclick = function(){
			var csDropdownButton = document.getElementById( 'cs-dropdownbtn' );
			csDropdownButton.innerText = ''; // remove content of button: text and symbol
			var dropdownSymbol = document.createElement( 'i' );
			dropdownSymbol.setAttribute( 'class' , 'fa fa-caret-down' );
			dropdownSymbol.setAttribute( 'style' , 'font-size:20px;' );
			csDropdownButton.appendChild( dropdownSymbol );
			var activeCS = this.id;
			lastActiveCS = activeCS; // bind to global variable
			var newButtonText = document.createTextNode( '\u00A0\u00A0 ' + activeCS );
			csDropdownButton.appendChild( newButtonText );
			// execute transformation and unhiding of the geometry in this CS
			for ( var i = 0 ; i < loadedGeometry.length ; i++ ){
				var geometryObject = scene.getObjectByName( loadedGeometry[i].geometryUri );
				if ( loadedGeometry[i].currentCS == activeCS ){ // already in active CS (unnamed CS)
					geometryObject.visible = true;
					if ( loadedGeometry[i].geometryType == 'https://w3id.org/gom#BoundingVolume' ){
						// go through group
						setOpacity( geometryObject , 0.5 );
					}
				} else { // not in CS that's connected to CS (= any named CS)
					geometryObject.visible = false;
				}
			}
		}
		dropdownCS.appendChild( optionCS );
	}
}

// set opacity of group of objects
function setOpacity( obj , opacity ){
	obj.traverse( child => {
		if ( child instanceof THREE.Mesh ){
			child.material.opacity = opacity;
		}
	});
}

// prepare error handling of querying
function filterActiveSources( sources , err ){
	var unavailableSources = [];
	unavailableSources.push( err.message.replace( 'Error requesting ' , '' ) ); // local TPF server not active
	unavailableSources.push( err.message.replace( 'Could not retrieve ' , '' ).replace(' (404: unknown error)' , '' ) ); // online file that doesn't exists
	var activeRdfSources = sources;
	// iterate through array of sources
	for ( var i = 0 ; i < sources.length ; i++ ){
		for ( var k = 0 ; k < unavailableSources.length ; k++ ){
			if ( sources[i].value == unavailableSources[k] ){
				activeRdfSources.splice( i , 1 );
			}
		}
	};
	return activeRdfSources;
}

// add CS info to JSON file (cs URI, array of CS to: cs URI, transformation Matrix4)
function addToCSList( d ){
	var csName = d['?cs'].value; //full URI
	// add cs
	var newCS = {
		csName: csName // full URI
	};
	// optionally also add first transformation if available
	if ( ( d['?to'] != null ) && ( d['?matrix'] != null ) ){
		var transformationMatrix = new THREE.Matrix4();
		if ( d['?matrix'].datatypeString == 'https://w3id.org/gom#columnMajorArray' ){
			var columnMajorArray = JSON.parse( d['?matrix'].value ); // parse string to JSON
			transformationMatrix.fromArray( columnMajorArray );
		} else if ( d['?matrix'].datatypeString == 'https://w3id.org/gom#rowMajorArray' ){
			var rowMajorArray = JSON.parse(d['?matrix'].value ); // parse string to JSON
			transformationMatrix.fromArray( rowMajorArray );
			transformationMatrix.transpose();
		} else {
			console.log( 'Cannot process transformation matrix: no datatype given to literal' );
			// TODO: error handling
		}
		newCS.transformationsTo = [
			{
				csName: d['?to'].value, // full URI
				transformationMatrix: transformationMatrix, // Matrix4
				inverse: false
			}
		]
	} else {
		newCS.transformationsTo = [];
	};
	cs.push( newCS );
}

// function to calculate the transformations iteratively => alt: can be done in SPARQL on in-memory RDF store
function calculateIndirectTransformations(){
	calculateInverseTransformations();
	calculateTwoStepTransformations(); // recursive function
	cs.sort( function( a , b ){ // sort CS JSON array by csName alphabetically
		var nameA = a.csName.toUpperCase(); // ignore upper and lowercase
		var nameB = b.csName.toUpperCase(); // ignore upper and lowercase
		if ( nameA < nameB ) {
			return -1;
		}
		if ( nameA > nameB ) {
			return 1;
		}
		// names must be equal
		return 0;
	})
	for ( var i = 0 ; i < cs.length ; i++ ){ // sort transformationsTo JSON array by csName alphabetically
		if ( cs[i].transformationsTo.length > 1 ){
			cs[i].transformationsTo.sort( function( a , b ){ // sort JSON array by csName alphabetically
				var nameA = a.csName.toUpperCase(); // ignore upper and lowercase
				var nameB = b.csName.toUpperCase(); // ignore upper and lowercase
				if ( nameA < nameB ) {
					return -1;
				}
				if ( nameA > nameB ) {
					return 1;
				}
				// names must be equal
				return 0;
			})
		}
	}
	createDropdownCS(); // put results of calculation in dropdown         
}

// function to calculate two-step (forward transformations (CS1 - transf1 -> CS2 - transf2 -> CS3))
function calculateTwoStepTransformations(){
	var newTransformations = false;
	for ( var i = 0 ; i < cs.length ; i++ ){ // iterate initial CS
		if ( cs[i].transformationsTo != null ){
			for ( var j = 0 ; j < cs[i].transformationsTo.length ; j++ ){ // check each transformation of initial CS
				for ( var k = 0 ; k < cs.length ; k++ ){ // iterate middle CS
					if ( cs[k].csName == cs[i].transformationsTo[j].csName ){ // find CS in JSON object
						//second step
						if ( cs[k].transformationsTo != null ){
							for ( var l = 0 ; l < cs[k].transformationsTo.length ; l++ ){ // check each transformations of middle CS
								var found = false;
								for ( var m = 0 ; m < cs[i].transformationsTo.length ; m++ ){ 
									if ( ( cs[i].csName == cs[k].transformationsTo[l].csName ) || ( cs[i].transformationsTo[m].csName == cs[k].transformationsTo[l].csName ) ){ // check if end CS same as initial OR direct transformation already exists for initial CS
										found = true;
										break;
									}
								}
								if ( !found ){
									// calculate multiplicated matrix
									var multiplicatedMatrix = new THREE.Matrix4();
									multiplicatedMatrix.multiplyMatrices( cs[k].transformationsTo[l].transformationMatrix , cs[i].transformationsTo[j].transformationMatrix)
									cs[i].transformationsTo.push({
										csName: cs[k].transformationsTo[l].csName, //name of last CS
										transformationMatrix: multiplicatedMatrix
									});
									newTransformations = true;
								}
							}
						}
					}
				}
			}
		}
	};
	if ( newTransformations ){
		calculateTwoStepTransformations();
	}
}

// function to calculate inverse transformations
function calculateInverseTransformations(){
	for ( var i = 0 ; i < cs.length ; i++ ){
		if ( cs[i].transformationsTo != null ){
			for ( var j = 0 ; j < cs[i].transformationsTo.length ; j++ ){ // check each transformations
				if ( cs[i].transformationsTo[j].inverse ){
					continue; //if already inverse: skip and go to next in array
				} else {
					for ( var k = 0 ; k < cs.length ; k++ ){ 
						if ( cs[k].csName == cs[i].transformationsTo[j].csName ){ // find CS in JSON object
							var found = false;                                
							for ( var l = 0 ; l < cs[k].transformationsTo.length ; l++ ){ // check if transformation already exists
								if ( cs[k].transformationsTo[l] == cs[i].transformationsTo[j] ){
									found = true;
									break;
								}
							}
							if ( !found ){ // add to transformationsTo of other CS
								// calculate inverse matrix
								var inverseMatrix = new THREE.Matrix4();
								inverseMatrix.getInverse( cs[i].transformationsTo[j].transformationMatrix );
								cs[k].transformationsTo.push({
									csName: cs[i].csName ,
									transformationMatrix: inverseMatrix,
									inverse: true // say that this object contains already the inverse transformation 
								})
							}
						}
					}
				}
			}
		}
	}
}

// create dropdown menu for CS based on JSON
function createDropdownCS(){
	if ( cs.length > 0 ){
		var dropdownCS = document.getElementById( 'cs-dropdown' );
		for ( var k = 0 ; k < cs.length ; k++ ){
			var optionCS = document.createElement( 'a' ); // workaround via anchor instead of select => reuse of dropdown-content style
			optionCS.setAttribute( 'id' , cs[k].csName ); // only the ID of the anchor can be retrieved
			optionCS.setAttribute( 'title' , cs[k].csName ) // lazy tooltip
			optionCS.onclick = function(){
				var csDropdownButton = document.getElementById( 'cs-dropdownbtn' );
				csDropdownButton.innerText = ''; // remove content of button: text and symbol
				var dropdownSymbol = document.createElement( 'i' );
				dropdownSymbol.setAttribute( 'class' , 'fa fa-caret-down' );
				dropdownSymbol.setAttribute( 'style' , 'font-size:20px;' );
				csDropdownButton.appendChild( dropdownSymbol );
				var activeCS = this.id; // full URI
				lastActiveCS = activeCS; // bind to global variable
				var newButtonText = document.createTextNode( '\u00A0\u00A0 ' + shortenUri( activeCS ) );
				csDropdownButton.appendChild( newButtonText );
				// execute transformation and unhiding of the geometry in this CS
				for ( var i = 0 ; i < loadedGeometry.length ; i++ ){
					// get object by id (= geometry URI)
					var geometryObject = scene.getObjectByName( loadedGeometry[i].geometryUri );
					if ( loadedGeometry[i].currentCS == activeCS ){ // geometry already in active CS
						geometryObject.visible = true;
						if ( loadedGeometry[i].geometryType == 'https://w3id.org/gom#BoundingVolume' ){
							// go through group
							setOpacity( geometryObject , 0.5 );
						}
					} else if ( existCSTransformation( loadedGeometry[i].currentCS , activeCS ) ){ // geometry in connected CS
						var transformationMatrix = getCSTransformation( loadedGeometry[i].currentCS , activeCS ); 
						// apply transformation to geometry
						geometryObject.applyMatrix( transformationMatrix );
						geometryObject.visible = true;
						// check if geometry is Nexus => if yes: tranform BB of the nexus object
						for ( var j = 0 ; j < arrayNexusBB_IDs.length ; j++ ){
							if ( geometryObject.id == arrayNexusBB_IDs[j][1] ){
								var nexusBB = scene.getObjectById( arrayNexusBB_IDs[j][0] );
								nexusBB.applyMatrix( transformationMatrix );
							}
						}
						if ( loadedGeometry[i].geometryType == 'https://w3id.org/gom#BoundingVolume' ){
							// go through group
							setOpacity( geometryObject , 0.5 );
						}
						loadedGeometry[i].currentCS = activeCS;
					} else { // geometry not in CS that's connected to CS
						geometryObject.visible = false;
					}
				}
			}
			// switch to k from i
			optionCS.innerText = shortenUri( cs[k].csName );
			if ( cs[k].transformationsTo.length > 0 ){
				optionCS.text += ' (transformations to: ';
				for ( var j = 0 ; j < cs[k].transformationsTo.length ; j++ ){
					optionCS.text += shortenUri( cs[k].transformationsTo[j].csName );
					if ( j == cs[k].transformationsTo.length-1 ){
						optionCS.text += ')';
					} else {
						optionCS.text += ', ';
					}
				}
			}
			// append option to dropdown
			dropdownCS.appendChild( optionCS );
		}
	}
}

// fetch transformation matrix to go from current CS of geometry to active CS
function getCSTransformation( currentCS , activeCS ){
	for ( var i = 0 ; i < cs.length ; i++ ){
		if ( currentCS == cs[i].csName ){
			for ( var j = 0 ; j < cs[i].transformationsTo.length ; j++ ){
				if ( activeCS == cs[i].transformationsTo[j].csName ){
					return cs[i].transformationsTo[j].transformationMatrix; // stops all outer for loops
				}
			}
		}
	}
}

// check if a transformation is available from currentCS to activeCS
function existCSTransformation( currentCS , activeCS ){
	var found = false;
	for ( var i = 0 ; i < cs.length ; i++ ){
		if ( currentCS == cs[i].csName ){
			for ( var j = 0 ; j < cs[i].transformationsTo.length ; j++ ){
				if ( activeCS == cs[i].transformationsTo[j].csName ){
					found = true;
					return found; // stops all outer for loops
				}
			}
		}
	}
	return found;
}

// shorten full URI based on list of prefixes
function shortenUri( uri ){
	shortenedUri = uri;
	for ( var i = 0 ; i < listOfPrefixes.length ; i++ ){
		shortenedUri = shortenedUri.replace( listOfPrefixes[i].namespace , listOfPrefixes[i].prefix + ':' );
	}
	// create custom prefix 'ns1' if unknown namespace (last hash or slash)
	if ( (shortenedUri == uri) && ( uri != '' ) && ( uri.includes( 'http' ) ) ){
		var namespace = '';
		// split URI after last hash or slash
		var indexOfLastSlash = uri.lastIndexOf( '/' ); // normally always exists
		var indexOfLastHash = uri.lastIndexOf( '#' ); // possibly doesn't exist
		if ( indexOfLastHash !== -1 ){
			if ( indexOfLastSlash > indexOfLastHash ){
				namespace = uri.substring( 0 , indexOfLastSlash + 1 );
			} else {
				namespace = uri.substring( 0 , indexOfLastHash + 1 );
			}
		} else {
			namespace = uri.substring( 0 , indexOfLastSlash + 1 );
		}
		// add to listOfPrefixes
		prefixNr++;
		var prefix = 'ns' + prefixNr;
		listOfPrefixes.push({
			prefix: prefix,
			namespace: namespace
		});
		// create shortenedUri
		shortenedUri = shortenedUri.replace( namespace , prefix + ':' );
	}
	return shortenedUri;
}

//////////////////////////////////////////////////////////////////////////////////////
// functions: query RDF data
//////////////////////////////////////////////////////////////////////////////////////

// function before querying selected comunica sources
function arrangeGeometryQuery(){
	spinner1.spin( document.getElementById( 'spinner' ) ); // start spinners => ends when query is finished
	// reset CS button from dropdown
	resetCSButton();
	//Extract from dropdownsources JSON
	if ( dropdownSources.length > 0 ){
		var sources = getSelectedSources(); // online and selected sources
		if ( sources.length == 0 ){
			spinner1.stop();
			alert( 'No (online) RDF sources selected. Please select at least one online RDF source.' );
		} else {
			// remove 'old' geometry by removing every element from the scene first
			scene.remove.apply( scene , scene.children ); // TODO: only replace geometry if asked instead of deleting everything everytime
			// add axis again
			scene.add( axisHelper );
			// add grid again
			scene.add( gridHelperXY );
			// add lights again
			scene.add( light1 );
			scene.add( light2 );
			scene.add( light );
			// reset variables (related to 'old' geometry)
			loadedGeometry = [];
			notLoadedGeometry = [];
			arrayPC_IDs = [];
			arrayNexusBB_IDs = [];
			// remove entries in loadedGeometryTable and notLoadedGeometryTable (body only)
			document.getElementById( 'loadedGeometryTableBody' ).innerHTML = '';
			document.getElementById( 'notLoadedGeometryTableBody' ).innerHTML = '';
			// query datasets and load retrieved geometry
			querySelectedComunicaSources( sources );
		}
	} else {
		spinner1.stop();
		alert( 'No RDF sources available for querying. Please add at least one RDF source.' );
	}
}

// function to execute query over selected comunica sources
function querySelectedComunicaSources( sources ) { 
	queryEngine
		.query( _querySupported_SizeFilteredAndUnknownSize , { sources: sources } ) // _queryAll _querySupported
		.then( function( result ) {
			result.bindingsStream.on( 'data', function( data ) { // for every result (stream) do:
				decodeGeometry( data.toObject() );
			});
			result.bindingsStream.on( 'end' , () => {
				spinner1.stop();
				// generate tables with loaded and unloaded geometry
				createTableGeometry( loadedGeometry , true );
				createTableGeometry( notLoadedGeometry , false );
			});
			// somehow doesn't start
			// result.bindingsStream.on( 'error' , ( err ) => console.error( err.message ) );
		})
		// somehow doesn't start
		// .catch( ( err ) => {
		// 	// check if unavailable sources => restart query
		// 	console.log( 'general error launched')
		// 	if ( err.message.includes( 'Error requesting ' ) || err.message.includes( 'Could not retrieve ' ) ){
		// 		console.log( 'error launched' );
		// 		var activeRdfSources = filterActiveSources( sources , err );
		// 		if ( activeRdfSources.length > 0 ){
		// 			querySelectedComunicaSources( activeRdfSources );
		// 		} else {
		// 			spinner1.stop();
		// 			alert( 'No valid RDF sources are available. Please check the URLs of the RDF sources and their availability.' );
		// 		}
		// 	}
		// });
}

//////////////////////////////////////////////////////////////////////////////////////
// functions: view query on screen
//////////////////////////////////////////////////////////////////////////////////////

// function to view query on screen
function renderQuery(q) {
	floatingDiv.style.display = 'block';

	// from js multiline text string to HTML text
	var queryHtml = q.split('<' ).join( '&lt'); //specific HTML sign for '<' in prefixes
	queryHtml = queryHtml.split('>' ).join( '&gt'); //specific HTML sign for '>' in prefixes
	queryHtml = queryHtml.split( '\n' ).join( '<br />' );
	queryHtml = queryHtml.split( '\t' ).join( '&nbsp&nbsp&nbsp&nbsp&nbsp' ); //5 spaces replace a tab
	
	floatingDiv.innerHTML = queryHtml ;
}

//////////////////////////////////////////////////////////////////////////////////////
// functions: geometry FILE loaders - RDF literals containing reference to external file
//////////////////////////////////////////////////////////////////////////////////////

// function for loading Nexus (NXS/NXZ) geometry
function loadThisNexus( geometryInfo , pathToNexusFile ){
	var nexus_obj = new NexusObject( pathToNexusFile , onNexusLoad , function() { redraw = true; } , renderer );
	nexus_obj.name = geometryInfo.geometryUri;
	// add info to JSON object
	loadedGeometry.push( geometryInfo );
	// hide geometry on load
	nexus_obj.visible = false;
	scene.add( nexus_obj );
    function onNexusLoad() {
		redraw = true;
		// create BB geometry
		// var boundingBox = new THREE.Box3Helper( nexus_obj.geometry.boundingBox , 0xffff00 ); // TODO: issue with transforming Box3Helper: nexus_obj.geometry.boundingBox stays in the same location after movement of nexus_obj
		// var boundingBox2 = new THREE.Box( nexus_obj.geometry.boundingBox , 0xff0000 );
		// var boundingBox3 = new THREE.BoxHelper( nexus_obj.geometry.boundingBox , 0x00FF00 ); // error: updateWorldMatrix is not a function after movement
		// scene.add( boundingBox );
		// boundingBox.material.visible = false;
		// arrayNexusBB_IDs.push( [boundingBox.id , nexus_obj.id] );
		var boundingBoxId = manuallyCreateBoundingBox( nexus_obj );
		arrayNexusBB_IDs.push( [boundingBoxId , nexus_obj.id] );
		if ( geometryInfo.geometryType == 'https://w3id.org/gom#PointCloudGeometry' ){
            // color of PC: default white or original color => force fixed color (e.g. color: 0x00ff00)
            // nexus_obj.material = new THREE.PointsMaterial( { size:500 , transparent: false , opacity: 1 , vertexColors: THREE.VertexColors } ); // opacity:0.25 // point size seems to have no influence
			nexus_obj.material = new THREE.PointsMaterial( { size:500 , transparent: true , opacity: 1 , vertexColors: THREE.VertexColors } ); // opacity:0.25 // point size seems to have no influence
			arrayPC_IDs.push( nexus_obj.id );
		};
		//nexus_obj.rotateX(-Math.PI/2);
    }
}

function manuallyCreateBoundingBox( nexus_obj ){
	var bbTemp = new THREE.Box3Helper( nexus_obj.geometry.boundingBox , 0xffff00 );
	var pointsGeom = new THREE.Geometry();
	pointsGeom.vertices.push(
		new THREE.Vector3( bbTemp.box.min.x , bbTemp.box.min.y , bbTemp.box.min.z ),
		new THREE.Vector3( bbTemp.box.max.x , bbTemp.box.max.y , bbTemp.box.max.z )
	)

	var cubeDiagonal = new THREE.Vector3().copy( pointsGeom.vertices[1] ).sub( pointsGeom.vertices[0] ).length(); // cube's diagonal
	var center = new THREE.Vector3().copy( pointsGeom.vertices[0] ).add( pointsGeom.vertices[1] ).multiplyScalar( 0.5 ); // cube's center
	
	var cubeSide = (cubeDiagonal * Math.sqrt(3)) / 3; // cube's edge's length via cube's diagonal
	
	var cubeGeom = new THREE.BoxBufferGeometry( cubeSide , cubeSide , cubeSide );

	var cube = new THREE.Mesh( cubeGeom , new THREE.MeshBasicMaterial({
		color: "aqua",
		wireframe: true
	  }));

	cube.position.copy( center );
	cube.visible = false; // always keep it hidden
	scene.add( cube );
	return cube.id;
}

// function for loading gltf geometry
function loadThisGLTF( geometryInfo , pathToJSON , colorGltf ){
	var loader = new THREE.GLTFLoader();
	loader.load(
		pathToJSON,
		function ( gltf ) { //object to gltf
			// set colored material
			gltf.scene.traverse( function( child ){
				if ( child instanceof THREE.Mesh ){
					child.material = new THREE.MeshStandardMaterial( { color: colorGltf , side: THREE.DoubleSide , transparent: true , opacity: 1 } ); //blue (glb) or red (gltf)
				}
			});
			gltf.scene.name = geometryInfo.geometryUri;
			// add info to JSON object
			loadedGeometry.push( geometryInfo );
			// hide geometry on load
			gltf.scene.visible = false;
			// add to scene
			scene.add( gltf.scene );
		},
		// onProgress callback
		function ( xhr ) { console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' ); },
		// onError callback
		function( err ) { console.log( 'An error happened' ); }
	)
};

// function for loading OBJ geometry - nurbs cannot be read
function loadThisOBJ( geometryInfo , pathToOBJ ){
	var colorObj = new THREE.Color( 0x008000 ); //green
	var loader = new THREE.OBJLoader();
	loader.load(
		pathToOBJ,
		function ( objFile ) {
			// set colored material
			objFile.traverse( function ( child ) {
				if ( child.isMesh ){
					child.material = new THREE.MeshStandardMaterial( { color: colorObj , side: THREE.DoubleSide , transparent: true , opacity: 1 } );
				}
			});
			objFile.name = geometryInfo.geometryUri;
			// add info to JSON object
			loadedGeometry.push( geometryInfo );
			// hide geometry on load
			objFile.visible = false;
			// add to scene
			scene.add( objFile );
		},
		// onProgress callback
		function ( xhr ) { console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' ); },
		// onError callback
		function( err ) { console.log( 'An error happened' ); }
	)
};

// function for loading COLLADA geometry
function loadThisCollada( geometryInfo , pathToCollada ){
	var colorCollada = new THREE.Color( 0x551A8B ); //purple
	var loader = new THREE.ColladaLoader();
	loader.load(
		pathToCollada,
		function ( colladaFile ) {
			// set colored material
			colladaFile.scene.traverse( function ( child ) {
				if ( child.isMesh ){
					child.material = new THREE.MeshStandardMaterial( { color: colorCollada , transparent: true , opacity: 1 } );
				}
			});
			colladaFile.scene.name = geometryInfo.geometryUri;
			// add info to JSON object
			loadedGeometry.push( geometryInfo );
			// hide geometry on load
			colladaFile.scene.visible = false;
			// add to scene
			// exportToGLTFFile( colladaFile.scene , true );
			scene.add( colladaFile.scene );
		},
		// onProgress callback
		function ( xhr ) { console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' ); },
		// onError callback
		function( err ) { console.log( 'An error happened' ); }
	)
};

// function for loading PLY (incl point cloud) geometry
function loadThisPLY( geometryInfo , pathToPLY , colorPly ){
	if ( geometryInfo.geometryType == 'https://w3id.org/gom#PointCloudGeometry' ){
		// fails to properly load PCs (looks like mesh + very high GPU)
		notLoadedGeometry.push( geometryInfo );
	} else { // mesh
		var loader = new THREE.PLYLoader();
		loader.load(
			pathToPLY,
			function ( plyGeometry ) {
				// create mesh with colored material
				// var plyMaterial = new THREE.MeshStandardMaterial( { color: colorPly , transparent: false , opacity: 0.5 , side: THREE.DoubleSide } ); // cyan (ascii ply) or grey (binaryLE) // PLY does not contain material
				var plyMaterial = new THREE.MeshStandardMaterial( { color: colorPly , transparent: true , opacity: 1 , side: THREE.DoubleSide } ); // cyan (ascii ply) or grey (binaryLE) // PLY does not contain material	
				
				var plyMesh = new THREE.Mesh ( plyGeometry , plyMaterial );
				plyMesh.name = geometryInfo.geometryUri;
				// add info to JSON object
				loadedGeometry.push( geometryInfo );
				// hide geometry on load
				plyMesh.visible = false;
				// add to scene
				scene.add( plyMesh );
				// download as GLB
				// exportToGLTFFile( plyMesh , true );
			},
			// onProgress callback
			function ( xhr ) { console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' ); },
			// onError callback
			function( err ) { console.log( 'An error happened' ); }
		)
	}
};

// function to load PCD point cloud
function loadThisPCD( geometryInfo , pathToPCD ){
	var colorPcd = new THREE.Color( 0xFF6633 ); // orange
	var loader = new THREE.PCDLoader();
	loader.load( 
		pathToPCD, 
		function ( points ) {
			points.name = geometryInfo.geometryUri;
			// add info to JSON object
			loadedGeometry.push( geometryInfo );
			// hide geometry on load
			points.visible = false;
			arrayPC_IDs.push( points.id );
			points.material.size = 0.5;
			points.material.color = colorPcd;
			scene.add( points );
		} 
	);
}

// function for loading SVG (2D vector): doesn't load text and numbers (https://discourse.threejs.org/t/solved-does-svg-loader-support-text/4096/3)
function loadThisSVG( geometryInfo , pathToSVG ){
	var loader = new THREE.SVGLoader();
	loader.load( 
		pathToSVG,
		function ( svgData ){
			var paths = svgData.paths;
			var group = new THREE.Group();
			// ACTIVE units transformation from pt to m (happens internally)
			var ptToM = ( 72 / 25.4 ) * 1000;
			group.scale.multiplyScalar( ( 1 / ptToM ) ); // first part is from pt to m // second part is scaling from export
			// static settings (instead of GUI)
			var guiData = { // true / true / false / false
				currentURL: pathToSVG,
				drawFillShapes: true,
				drawStrokes: true,
				fillShapesWireframe: false,
				strokesWireframe: false
			}
			// rest
			for ( var i = 0; i < paths.length; i ++ ) {
				var path = paths[ i ];
				var fillColor = path.userData.style.fill;
				if ( guiData.drawFillShapes && fillColor !== undefined && fillColor !== 'none' ) {
					var material = new THREE.MeshBasicMaterial( {
						color: new THREE.Color().setStyle( fillColor ),
						opacity: path.userData.style.fillOpacity,
						transparent: path.userData.style.fillOpacity < 1,
						side: THREE.DoubleSide, //DoubleSide,
						depthWrite: false,
						wireframe: guiData.fillShapesWireframe
					} );
					var shapes = path.toShapes( true );
					for ( var j = 0; j < shapes.length; j ++ ) {
						var shape = shapes[ j ];
						var geometry = new THREE.ShapeBufferGeometry( shape );
						var mesh = new THREE.Mesh( geometry , material );
						group.add( mesh );
					}
				}
				var strokeColor = path.userData.style.stroke;
				if ( guiData.drawStrokes && strokeColor !== undefined && strokeColor !== 'none' ) {
					var material = new THREE.MeshBasicMaterial( {
						color: new THREE.Color().setStyle( strokeColor ),
						opacity: path.userData.style.strokeOpacity,
						transparent: path.userData.style.strokeOpacity < 1,
						side: THREE.DoubleSide, // FrontSide, // other method to know what the front is?
						depthWrite: false,
						wireframe: guiData.strokesWireframe
					} );
					for ( var j = 0, jl = path.subPaths.length; j < jl; j ++ ) {
						var subPath = path.subPaths[ j ];
						var geometry = THREE.SVGLoader.pointsToStroke( subPath.getPoints(), path.userData.style );
						if ( geometry ) {
							var mesh = new THREE.Mesh( geometry , material );
							group.add( mesh );
						}
					}
				}
			}
			group.name = geometryInfo.geometryUri;
			// add info to JSON object
			loadedGeometry.push( geometryInfo );
			// hide geometry on load
			group.visible = false;
			// add geometry to scene
			scene.add( group );
		},
		// onProgress callback
		function ( xhr ) { console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' ); },
		// onError callback
		function( err ) { console.log( 'An error happened' ); }
	)
};

//////////////////////////////////////////////////////////////////////////////////////
// functions: geometry STRING loaders - from RDF literals containing embedded geometry
//////////////////////////////////////////////////////////////////////////////////////

// function for loading OBJ geometry from STRING - export from Rhino as mesh (nurbs cannot be read)
function loadThisOBJString( geometryInfo , data ){
	var colorObj = new THREE.Color( 0x008000 ); //green
	var loader = new THREE.OBJLoader();
	myObject = loader.parse( data );
	// set colored material
	myObject.traverse( function ( child ) {
		if ( child.isMesh ){
			child.material = new THREE.MeshStandardMaterial( { color: colorObj , side: THREE.DoubleSide , transparent: true , opacity: 1 } ); //green
			// toZup(child); // should be included in RDF that this is Y-up geometry
		}
	});
	myObject.name = geometryInfo.geometryUri;
	// add info to JSON object
	loadedGeometry.push( geometryInfo );
	// hide geometry on load
	myObject.visible = false;
	// add to scene
	scene.add( myObject );
};

function loadThisPLYString( geometryInfo , data , colorPly ){
	var loader = new THREE.PLYLoader();
	plyGeometry = loader.parse( data );
	var plyMaterial = new THREE.MeshStandardMaterial( { color: colorPly , transparent: true , opacity: 1 } ); // cyan (ascii) or grey (binaryLE) // PLY does not contain material
	var plyMesh = new THREE.Mesh ( plyGeometry , plyMaterial );
	plyMesh.name = geometryInfo.geometryUri;
	// add info to JSON object
	loadedGeometry.push( geometryInfo );
	// hide geometry on load
	plyMesh.visible = false;
	// add to scene
	scene.add( plyMesh );
}

function loadThisGltfString( geometryInfo , data , colorGltf ){
	var loader = new THREE.GLTFLoader();
	loader.parse( data , '', ( gltf ) => {
		// set colored material
		gltf.scene.traverse( function( child ){
			if ( child instanceof THREE.Mesh ){
				child.material = new THREE.MeshStandardMaterial( { color: colorGltf , transparent: true , opacity: 1 } ); //red (gltf) or blue (glb)
			}
		});
		gltf.scene.name = geometryInfo.geometryUri;
		// add info to JSON object
		loadedGeometry.push( geometryInfo )
		// hide geometry on load
		gltf.scene.visible = false;
		// // render in bounding box style
		// var bbox = new THREE.Box3().setFromObject( gltf.scene );
		// var bboxHelper = new THREE.Box3Helper( bbox , 0xffff00 );
		// // hide geometry on load
		// bboxHelper.visible = false;
		// // var boundingBox = new THREE.Box3Helper( child.geometry.boundingBox , 0xffff00);
		// scene.add( bboxHelper );
		// add to scene
		scene.add( gltf.scene );
	});
};

////////////////////////////////////////////////////////////////////////////////////////////////////
//// exporters
////////////////////////////////////////////////////////////////////////////////////////////////////
// function to export to GLTF+GLB FILE
function exportToGLTFFile( thing , binary ) {
	var fileName = 'background';
	var gltfExporter = new THREE.GLTFExporter();

	var options = {
		trs: false,
		onlyVisible: true,
		truncateDrawRange: true,
		binary: false, // changes
		forceIndices: false,
		forcePowerOfTwoTextures: false
	}
	if ( binary ){
		options.binary = true;
	}

	gltfExporter.parse( thing , function ( result ) {
		if ( result instanceof ArrayBuffer ) {
			saveArrayBuffer( result , fileName + '.glb' );
		} else {
			var output = JSON.stringify( result , null , 2 );
			saveString( output , fileName + '.gltf' );
		}
	} , options );
}

function saveString( text , filename ) {
	save( new Blob( [ text ] , { type: 'text/plain' } ) , filename );
}

function saveArrayBuffer( buffer , filename ) {
	save( new Blob( [ buffer ] , { type: 'application/octet-stream' } ) , filename );
}

function save( blob , filename ) {
	link.href = URL.createObjectURL( blob );
	link.download = filename;
	link.click();
	// URL.revokeObjectURL( url ); breaks Firefox...
}

////////////////////////////////////////////////////////////////////////////////////////////////////
//// functions for curtain overlay
////////////////////////////////////////////////////////////////////////////////////////////////////

function openNav( elementId ) {
	document.getElementById( elementId ).style.width = '100%';
	// lock threejs controller
	controls.enabled = false;
}

function closeNav( elementId ) {
	document.getElementById( elementId ).style.width = '0%';
	// unlock threejs controller
	controls.enabled = true;
}

////////////////////////////////////////////////////////////////////////////////////////////////////
//// functions for HTML elements in side navigation bar
////////////////////////////////////////////////////////////////////////////////////////////////////

//
function createQueryRender() {
	query1Div = document.getElementById( 'query1' );
	query1Div.innerHTML = jsMultilineTextToHtmlText( _queryCSAllNamed );

	query1Div = document.getElementById( 'query2' );
	query1Div.innerHTML = jsMultilineTextToHtmlText( _queryCSUnnamed );

	query1Div = document.getElementById( 'query3' );
	query1Div.innerHTML = jsMultilineTextToHtmlText( _querySupported_SizeFilteredAndUnknownSize );
}

//
function jsMultilineTextToHtmlText( jsText ){
	var textHtml = jsText.split('<' ).join( '&lt'); //specific HTML sign for '<' in prefixes
	textHtml = textHtml.split('>' ).join( '&gt'); //specific HTML sign for '>' in prefixes
	textHtml = textHtml.split( '\n' ).join( '<br />' );
	textHtml = textHtml.split( '\t' ).join( '&nbsp&nbsp&nbsp&nbsp&nbsp' ); //5 spaces replace a tab
	return textHtml;
}

// create table cell: anchor
function createTableCellAnchor( uri ){
	var td = document.createElement( 'td' );
	var a = document.createElement( 'a' );
	a.appendChild( document.createTextNode( shortenUri( uri ) ) ); // link text
	a.href = uri; // full link URL
	a.target = '_blank';
	td.appendChild( a );
	return td;
}

// create table of loaded geometry
function createTableGeometry( listOfGeometries , loaded ){
	var tableBody = ''
	if ( loaded ){
		tableBody = document.getElementById( 'loadedGeometryTableBody' );
	} else {
		tableBody = document.getElementById( 'notLoadedGeometryTableBody' );
	}
	
	for ( let i = 0 ; i < listOfGeometries.length ; i++ ){ // per geometry element a row
		var tr = document.createElement( 'tr' );
		// building element or zone URI (optional)
		var td0 = createTableCellAnchor( listOfGeometries[i].elementOrZoneUri );
		tr.appendChild( td0 );
		// geometry node URI
		var td1 = createTableCellAnchor( listOfGeometries[i].geometryUri );
		tr.appendChild( td1 );
		// geometry format (FOG property URI)
		var td2 = createTableCellAnchor( listOfGeometries[i].fogProp )
		tr.appendChild( td2 );
		// datatype of literal (XSD or custom datatype URI)
		var td3 = createTableCellAnchor( listOfGeometries[i].datatype )
		tr.appendChild( td3 );
		// geometry type (GOM URI)
		var td4 = createTableCellAnchor( listOfGeometries[i].geometryType )
		tr.appendChild( td4 );
		// original CS (instance URI)
		if ( listOfGeometries[i].originalCS == 'unnamed Coordinate System' ){
			var td5 = document.createElement( 'td' );
			td5.appendChild( document.createTextNode( listOfGeometries[i].originalCS ) ); // as text
			tr.appendChild( td5 );
		} else {
			var td5 = createTableCellAnchor( listOfGeometries[i].originalCS )
			tr.appendChild( td5 );
		}
		// CS linked to active CS (array of instance URIs)
		// zoom to
		if ( loaded ){ // no zoom/hide/show/... for not loaded geometry possible
			var td6 = document.createElement( 'td' );
			var a6 = document.createElement( 'a' );
			a6.appendChild( document.createTextNode( 'zoom to' ) );
			a6.onclick = function(){ // wrap in other function otherwise executed directly when created
				zoomToLoaded( [listOfGeometries[i]] );
			}
			td6.appendChild( a6 );
			tr.appendChild( td6 );

			// show/hide button
			var td6b = document.createElement( 'td' );
			var a6b = document.createElement( 'a' );
			a6b.appendChild( document.createTextNode( 'show/hide' ))
			a6b.onclick = function(){
				hideShowSelectedGeometry( listOfGeometries[i].geometryUri );
			}
			td6b.appendChild( a6b );
			tr.appendChild( td6b );

			// highlight		
			// isolate function
			// change color
			// wireframe/solid
			// delete geometry: delete from loadedGeometry/notLoadedGeometry and scene
		}

		// download original geometry to file
		var td7 = document.createElement( 'td' );
		var a7 = document.createElement( 'a' );
		a7.appendChild( document.createTextNode( 'download' ) ); // link text
		a7.onclick = listOfGeometries[i].downloadFunc;
		td7.appendChild( a7 );
		tr.appendChild( td7 );

		// add row to table body
		tableBody.appendChild( tr );
	};
	// sort table alphabetically after creation 
	if ( loaded ){
		sortTable( 1 , 'loadedGeometryTableBody' );
	} else {
		sortTable( 1 , 'notLoadedGeometryTableBody' );
	}
}

// sorting HTML tables by clicking the table header: https://www.w3schools.com/howto/howto_js_sort_table.asp
function sortTable( n , tableBodyId ) {
	var table , rows , switching , i , x , y , shouldSwitch , dir , switchcount = 0;
	table = document.getElementById( tableBodyId );
	switching = true;
	// Set the sorting direction to ascending:
	dir = 'asc';
	/* Make a loop that will continue until
	no switching has been done: */
	while ( switching ) {
		// Start by saying: no switching is done:
		switching = false;
		rows = table.rows;
		/* Loop through all table body rows */
		for ( i = 0 ; i < ( rows.length - 1 ) ; i++ ) {
			// Start by saying there should be no switching:
			shouldSwitch = false;
			/* Get the two elements you want to compare,
			one from current row and one from the next: */
			x = rows[i].getElementsByTagName( 'TD' )[n];
			y = rows[i + 1].getElementsByTagName( 'TD' )[n];
			/* Check if the two rows should switch place,
			based on the direction, asc or desc: */
			if ( dir == 'asc' ) {
			if ( x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase() ) {
				// If so, mark as a switch and break the loop:
				shouldSwitch = true;
				break;
			}
			} else if (dir == 'desc') {
			if ( x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase() ) {
				// If so, mark as a switch and break the loop:
				shouldSwitch = true;
				break;
			}
			}
		}
		if ( shouldSwitch ) {
			/* If a switch has been marked, make the switch
			and mark that a switch has been done: */
			rows[i].parentNode.insertBefore( rows[i + 1], rows[i] );
			switching = true;
			// Each time a switch is done, increase this count by 1:
			switchcount ++;
		} else {
			/* If no switching has been done AND the direction is "asc",
			set the direction to "desc" and run the while loop again. */
			if ( switchcount == 0 && dir == 'asc' ) {
			dir = 'desc';
			switching = true;
			}
		}
	}
}