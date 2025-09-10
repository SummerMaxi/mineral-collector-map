#!/usr/bin/env node

// Build script to inject environment variables into config.js for deployment
const fs = require('fs');
const path = require('path');

// Read the config template
const configPath = path.join(__dirname, 'config.js');
let configContent = fs.readFileSync(configPath, 'utf8');

// Get environment variables
const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN || 'MISSING_MAPBOX_TOKEN';
const defaultTheme = process.env.DEFAULT_THEME || 'dark';

// Replace placeholders with actual environment variables
configContent = configContent.replace(
    /MAPBOX_ACCESS_TOKEN:\s*[\s\S]*?(?=,|\})/,
    `MAPBOX_ACCESS_TOKEN: '${mapboxToken}'`
);

configContent = configContent.replace(
    /DEFAULT_THEME:\s*[\s\S]*?(?=\})/,
    `DEFAULT_THEME: '${defaultTheme}'`
);

// Write the updated config
fs.writeFileSync(configPath, configContent);

console.log('✅ Environment variables injected into config.js');
console.log(`   MAPBOX_ACCESS_TOKEN: ${mapboxToken.substring(0, 20)}...`);
console.log(`   DEFAULT_THEME: ${defaultTheme}`);