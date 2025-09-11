// Script to parse Fabian's collection data with simple country mapping
const fs = require('fs');

// Simple country coordinates mapping
const countryCoordinates = {
    'Brazil': { latitude: -14.235, longitude: -51.9253 },
    'China': { latitude: 35.8617, longitude: 104.1954 },
    'Colombia': { latitude: 4.5709, longitude: -74.2973 },
    'USA': { latitude: 39.8283, longitude: -98.5795 },
    'Russia': { latitude: 61.524, longitude: 105.3188 },
    'Bolivia': { latitude: -16.2902, longitude: -63.5887 },
    'Tajikistan': { latitude: 38.861, longitude: 71.2761 },
    'Germany': { latitude: 51.1657, longitude: 10.4515 },
    'Pakistan': { latitude: 30.3753, longitude: 69.3451 },
    'Peru': { latitude: -9.19, longitude: -75.0152 }
};

// Read Fabian's collection data
const fabianData = JSON.parse(fs.readFileSync('./fabian.json', 'utf8'));

// Parse and group specimens by country
const collectionByCountry = {};
let totalSpecimens = 0;
let totalSpecies = new Set();

// Get all specimens from the top-level specimens array
const specimens = fabianData.specimens;

console.log(`Processing ${specimens.length} specimens...`);

specimens.forEach((specimen, index) => {
    if (specimen.location && specimen.location.trim() !== '') {
        totalSpecimens++;
        
        // Extract country from location (first part before comma)
        const locationParts = specimen.location.split(',');
        const country = locationParts[0].trim();
        
        console.log(`${index + 1}. ${specimen.title || 'Specimen'} from ${country}`);
        
        if (!collectionByCountry[country]) {
            collectionByCountry[country] = {
                name: country,
                specimens: [],
                specimenCount: 0,
                species: new Set(),
                coordinates: countryCoordinates[country] || null
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
    }
});

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
        intensity: Math.min(collectionByCountry[country].specimenCount / 3, 1.0) // Scale intensity
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

console.log('\n📋 Sample specimens:');
fabianCollection.focusAreas.slice(0, 2).forEach(area => {
    console.log(`\n${area.name}:`);
    area.specimens.slice(0, 2).forEach(specimen => {
        console.log(`  - ${specimen.title}`);
        console.log(`    Species: ${specimen.species?.join(', ') || 'N/A'}`);
        console.log(`    Location: ${specimen.location}`);
    });
});