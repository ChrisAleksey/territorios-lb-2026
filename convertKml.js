const fs = require('fs');
const { DOMParser } = require('@xmldom/xmldom');
const toGeoJSON = require('@tmcw/togeojson');

console.log("Reading KML file...");
const kmlStr = fs.readFileSync('./Territorios Digitales Loma Bonita.kml', 'utf8');

console.log("Parsing KML...");
const kml = new DOMParser().parseFromString(kmlStr, 'text/xml');

console.log("Converting to GeoJSON...");
const converted = toGeoJSON.kml(kml);

console.log("Writing to territorios.geojson...");
fs.writeFileSync('./territorios.geojson', JSON.stringify(converted, null, 2));

console.log(`Conversion complete! Found ${converted.features ? converted.features.length : 0} features.`);
