## Design decisions

Address each of the four ambiguous areas (one to three sentences each):

1. **Map provider** — which provider you chose and the trade-off versus the alternatives.
The map provider I chose is Mapbox over Leaflet and Google because it offers built-in clustering for points, scaleable for real-world application and utilizes WebGL rendering rather than DOM rendering in Leaflet. Additionally, I found Mapbox's map UI more appealing than Leaflet/OpenStreetMaps UI since Mapbox's baselayer includes point-of-interests and streets which are important when factoring a place to rent. These factors can improve user experience and help renters determine what's around the location they're wanting to move to.  

2. **Performance at density** — how you keep the map smooth with all markers visible (clustering, viewport rendering, etc.) and what you observed.

- WebGL map layering


3. **Geospatial querying** — how the server answers a viewport query without scanning the table, and how you use the geohash index.

4. **Filtering model** — the dimensions you support, how filters compose, and the empty/reset behaviour.

## What I'd add with more time
Add pictures to the popup 

Describe the highest-value improvements you would make next.
