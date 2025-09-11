// Script to parse Fabian's collection data and group by countries with geocoding
const fs = require('fs');
const https = require('https');

// Read Fabian's collection data
const fabianData = JSON.parse(fs.readFileSync('./fabian.json', 'utf8'));

// Parse and group specimens by country
const collectionByCountry = {};
let totalSpecimens = 0;
let totalSpecies = new Set();

// Cache for geocoded locations to avoid duplicate API calls
const geocodeCache = {};

// Function to geocode location names using OpenStreetMap Nominatim (free)
async function geocodeLocation(locationName) {
    if (geocodeCache[locationName]) {
        return geocodeCache[locationName];
    }
    
    return new Promise((resolve) => {
        const encodedLocation = encodeURIComponent(locationName);
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedLocation}&limit=1`;
        
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result && result.length > 0) {
                        const coords = {
                            latitude: parseFloat(result[0].lat),
                            longitude: parseFloat(result[0].lon),
                            displayName: result[0].display_name
                        };
                        geocodeCache[locationName] = coords;
                        console.log(`✅ Geocoded: ${locationName} -> ${coords.latitude}, ${coords.longitude}`);
                        resolve(coords);
                    } else {
                        console.log(`❌ No coordinates found for: ${locationName}`);
                        geocodeCache[locationName] = null;
                        resolve(null);
                    }
                } catch (error) {
                    console.log(`❌ Error geocoding ${locationName}:`, error.message);
                    geocodeCache[locationName] = null;
                    resolve(null);
                }
            });
        }).on('error', (error) => {
            console.log(`❌ Network error geocoding ${locationName}:`, error.message);
            geocodeCache[locationName] = null;
            resolve(null);
        });
        
        // Add delay to respect rate limiting
        setTimeout(() => {}, 1000);
    });
}

// Function to process specimens with geocoding
async function processSpecimens() {
    // Get all specimens from the top-level specimens array (detailed data)
    const specimens = fabianData.specimens;
    
    console.log(`Processing ${specimens.length} specimens...`);
    
    for (let i = 0; i < specimens.length; i++) {
        const specimen = specimens[i];
        
        if (specimen.location && specimen.location.trim() !== '') {
            totalSpecimens++;
            
            // Get coordinates for the location
            const coordinates = await geocodeLocation(specimen.location);
            
            // Extract country from location (first part before comma)
            const locationParts = specimen.location.split(',');
            const country = locationParts[0].trim();
            
            if (!collectionByCountry[country]) {
                collectionByCountry[country] = {
                    name: country,
                    specimens: [],
                    specimenCount: 0,
                    species: new Set(),
                    coordinates: coordinates // Add coordinates to country
                };
            }
            
            // Add specimen to country
            collectionByCountry[country].specimens.push({
                id: specimen.id,
                title: specimen.title,
                imageUrl: specimen.imageUrl,
                species: specimen.species || [],
                minerals: specimen.minerals || [],
                location: specimen.location,
                locality: specimen.locality,
                size: specimen.size,
                dimensions: specimen.dimensions,
                description: specimen.description,
                properties: specimen.properties || {},
                coordinates: coordinates,
                images: specimen.images || []
            });
            
            collectionByCountry[country].specimenCount++;
            
            // Add species to both country and global sets
            if (specimen.species) {
                specimen.species.forEach(species => {
                    collectionByCountry[country].species.add(species);
                    totalSpecies.add(species);
                });
            }
            
            // Delay between requests to respect rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    return processResults();
}

function processResults() {
    // Convert sets to arrays and calculate stats
    Object.keys(collectionByCountry).forEach(country => {
        collectionByCountry[country].species = Array.from(collectionByCountry[country].species);
        collectionByCountry[country].speciesCount = collectionByCountry[country].species.length;
    });

    // Create final collection structure
    const fabianCollection = {
        collector: {
            name: "Fabian Wildfang",
            url: fabianData.collector.url,
            collectorId: fabianData.collector.collectorId,
            description: fabianData.collector.description,
            location: fabianData.collector.location
        },
        focusAreas: Object.keys(collectionByCountry).map(country => ({
            name: country,
            country: country,
            specimenCount: collectionByCountry[country].specimenCount,
            speciesCount: collectionByCountry[country].speciesCount,
            species: collectionByCountry[country].species,
            specimens: collectionByCountry[country].specimens,
            coordinates: collectionByCountry[country].coordinates,
            intensity: Math.min(collectionByCountry[country].specimenCount / 10, 1.0) // Scale intensity
        })),
        totalSpecimens: totalSpecimens,
        totalSpecies: totalSpecies.size,
        totalCountries: Object.keys(collectionByCountry).length
    };

    // Output results
    console.log('\n=== FABIAN\'S COLLECTION SUMMARY ===');
    console.log(`Total Specimens: ${fabianCollection.totalSpecimens}`);
    console.log(`Total Species: ${fabianCollection.totalSpecies}`);
    console.log(`Total Countries: ${fabianCollection.totalCountries}`);

    console.log('\n=== COUNTRIES WITH SPECIMENS ===');
    fabianCollection.focusAreas
        .sort((a, b) => b.specimenCount - a.specimenCount)
        .forEach(area => {
            const coords = area.coordinates;
            const coordsStr = coords ? `(${coords.latitude.toFixed(2)}, ${coords.longitude.toFixed(2)})` : '(no coords)';
            console.log(`${area.name}: ${area.specimenCount} specimens, ${area.speciesCount} species ${coordsStr}`);
        });

    // Save processed data
    fs.writeFileSync('./fabian-processed.json', JSON.stringify(fabianCollection, null, 2));
    console.log('\n✅ Processed data saved to fabian-processed.json');
    
    // Save geocode cache for future use
    fs.writeFileSync('./geocode-cache.json', JSON.stringify(geocodeCache, null, 2));
    console.log('✅ Geocode cache saved to geocode-cache.json');
}

// Start processing
console.log('🚀 Starting to process Fabian\'s collection with geocoding...');
processSpecimens().catch(console.error);