# fog-demo-app: a demo web application demonstrating the application of FOG, OMG and GOM ontologies

## Run on gh pages (online)
Simply navigate in your browser to https://mathib.github.io/fog-demo-app/ and start the demo.

## Run on local server
Alternatively, it is possible to download the code in this repository and run it on a local HTTP server:

* download the ZIP or do `git clone https://github.com/mathib/fog-demo-app.git` if you're comfortable with GIT
* start a local HTTP server, e.g. using http-server for node.js: `http-server -c-1 -p 8000`
* open http://localhost:8000 in your browser

## Background information
This web application is made to demonstrate how geometry descriptions in a Linked Data context (either embedded or referenced from RDF literals) can be used. More specifically, it can work with RDF structured using terminology from the [FOG](https://w3id.org/fog#), [OMG](https://w3id.org/omg#) and [GOM](https://w3id.org/gom#). These ontologies provide a flexible and uniform method to link geometry descriptions to spatial things (e.g. a building element or zone) it describes.

The application creates a visual mashup of the geometry descriptions, taking into account the Coordinate Systems they are defined in, found in the used Linked Data Fragments (e.g. an RDF file, a Triple Pattern Fragment server or a SPARQL endpoint) using the SPARQL query language.
If you want to add sample RDF containing geometry descriptions of your own, you can try one of the following options:
* host the RDF files on a file server, e.g. Github or Dropbox
* run a [Triple Pattern Fragment (TPF) server](https://github.com/LinkedDataFragments/Server.js/tree/master), with a local or online TPF endpoint, serving the RDF. A [Docker file](https://github.com/LinkedDataFragments/Server.js/tree/master#optional-running-in-a-docker-container) is available to get you up and running fast.
* store the RDF in an RDF triplestore, with a local or online SPARQL endpoint (note that some triplestores might cause issues with the Comunica query engine used).

**Note**: always either embed the geometry in an RDF literal, or host it on file server, e.g. Dropbox or Github. The browser cannot retrieve geometry files that are on your local computer, unless you run the application locally; in that case it can only access geometry files stored in the application folder.

Using the terminology from OMG/FOG/GOM, the web application can filter for geometry descriptions with certain properties (geometry schema, geometry type, file size, building element or zone it describes, etc.).
Look in the SPARQL queries used (side navigation bar), to see which geometry formats can be rendered by this application. Geometry in other formats will be listed as 'Not Loaded Geometry Descriptions' in the results table (side navigation bar).

## Used third party libraries
Besides vanilla javascript, HTML and CSS, the application reuses code from the following libraries:

* Comunica SPARQL (Ghent University imec) for querying disparate Linked Data sources: https://github.com/comunica/comunica/tree/master/packages/actor-init-sparq
* three.js for rendering the geometry descriptions: https://github.com/mrdoob/three.js/
* Nexus library (Visual Computing Library ISTI-CNR) for the creation and visualization of multiresolution 3D models (incl. three.js loader): https://github.com/cnr-isti-vclab/nexus
* Font Awesome for the icons used in the web application: https://fontawesome.com/
* spin.js for the waiting spinner: https://spin.js.org/

## Disclaimer
This web application is made and maintained by [Mathias Bonduel](https://www.researchgate.net/profile/Mathias_Bonduel) (KU Leuven) and is only meant for demoing the usage geometry in a Linked Data context. 
A large amount of optimization is still possible and errors might occur.

## References
Please cite the following paper when referening to the usage of FOG and OMG:

* Bonduel, M., Wagner, A., Pauwels, P., Vergauwen, M., & Klein, R. (2019). Including Widespread Geometry Formats in Semantic Graphs Using RDF Literals. In *Proceedings of the European Conference on Computing in Construction (EC3 2019)*. Chania, Greece.
