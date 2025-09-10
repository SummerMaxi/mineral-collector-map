// Mineral Collector Globe Application
class MineralCollectorMap {
    constructor() {
        this.map = null;
        this.isDarkMode = true; // Default to dark mode
        this.isCollectionView = false;
        this.collectors = mineralCollectors;
        this.personalCollection = personalCollection;
        this.stats = globalStats;
        this.markers = [];
        this.heatmapLayer = null;
        
        this.init();
    }

    init() {
        // Set Mapbox access token from environment configuration
        mapboxgl.accessToken = window.CONFIG.MAPBOX_ACCESS_TOKEN;
        
        this.initializeMap();
        this.setupEventListeners();
        this.loadCollectors();
        this.hideLoadingScreen();
    }

    initializeMap() {
        this.map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/dark-v11',
            projection: 'globe',
            center: [0, 30],
            zoom: 1.5,
            pitch: 0,
            bearing: 0,
            antialias: true
        });

        // Add navigation controls
        this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');
        this.map.addControl(new mapboxgl.FullscreenControl(), 'top-right');

        // Set globe atmosphere based on theme
        this.map.on('style.load', () => {
            this.updateGlobeAtmosphere();
        });

        // Handle zoom changes for globe/mercator projection
        this.map.on('zoom', () => {
            if (this.map.getZoom() > 5) {
                this.map.setProjection('mercator');
            } else {
                this.map.setProjection('globe');
            }
        });

        this.map.on('load', () => {
            this.setupDataSources();
        });
    }

    setupDataSources() {
        // Remove existing layers first
        this.removeExistingLayers();

        // Remove existing sources if they exist (to prevent re-addition errors)
        if (this.map.getSource('collectors')) {
            this.map.removeSource('collectors');
        }
        if (this.map.getSource('collection-areas')) {
            this.map.removeSource('collection-areas');
        }

        // Add collectors source
        this.map.addSource('collectors', {
            type: 'geojson',
            data: this.createCollectorsGeoJSON(),
            cluster: true,
            clusterMaxZoom: 8,
            clusterRadius: 50
        });

        // Add personal collection areas source
        this.map.addSource('collection-areas', {
            type: 'geojson',
            data: this.createCollectionAreasGeoJSON()
        });

        this.addCollectorLayers();
        this.addCollectionLayers();
        this.updateViewMode();
    }

    removeExistingLayers() {
        const layersToRemove = [
            'clusters',
            'cluster-count', 
            'unclustered-point',
            'collection-areas-fill',
            'collection-areas-line'
        ];

        layersToRemove.forEach(layerId => {
            if (this.map.getLayer(layerId)) {
                this.map.removeLayer(layerId);
            }
        });
    }

    createCollectorsGeoJSON() {
        return {
            type: 'FeatureCollection',
            features: this.collectors.map(collector => ({
                type: 'Feature',
                properties: {
                    id: collector.id,
                    name: collector.name,
                    location: collector.location,
                    country: collector.country,
                    specialization: collector.specialization,
                    totalMinerals: collector.totalMinerals,
                    rareFinds: collector.rareFinds,
                    yearsCollecting: collector.yearsCollecting,
                    favoriteMineral: collector.favoriteMineral,
                    bio: collector.bio,
                    profileImage: collector.profileImage,
                    minerals: JSON.stringify(collector.minerals)
                },
                geometry: {
                    type: 'Point',
                    coordinates: collector.coordinates
                }
            }))
        };
    }

    createCollectionAreasGeoJSON() {
        // For now, we'll use state boundary approximations
        // In production, you'd want to use actual state boundary GeoJSON data
        const stateApproximations = {
            "Washington": [
                [-124.7, 45.5], [-124.7, 49.0], [-116.9, 49.0], [-116.9, 45.5], [-124.7, 45.5]
            ],
            "Colorado": [
                [-109.0, 37.0], [-109.0, 41.0], [-102.0, 41.0], [-102.0, 37.0], [-109.0, 37.0]
            ],
            "North Carolina": [
                [-84.3, 33.8], [-84.3, 36.6], [-75.4, 36.6], [-75.4, 33.8], [-84.3, 33.8]
            ],
            "Arizona": [
                [-114.8, 31.3], [-114.8, 37.0], [-109.0, 37.0], [-109.0, 31.3], [-114.8, 31.3]
            ]
        };

        const features = [];
        
        this.personalCollection.focusAreas.forEach(area => {
            const stateCoords = stateApproximations[area.state];
            if (stateCoords) {
                features.push({
                    type: 'Feature',
                    properties: {
                        name: area.name,
                        state: area.state,
                        intensity: area.intensity,
                        mineralCount: area.mineralCount,
                        description: area.description,
                        minerals: JSON.stringify(area.minerals)
                    },
                    geometry: {
                        type: 'Polygon',
                        coordinates: [stateCoords]
                    }
                });
            }
        });
        
        return {
            type: 'FeatureCollection',
            features: features
        };
    }

    addCollectorLayers() {
        // Clusters
        this.map.addLayer({
            id: 'clusters',
            type: 'circle',
            source: 'collectors',
            filter: ['has', 'point_count'],
            paint: {
                'circle-color': [
                    'step',
                    ['get', 'point_count'],
                    '#10b981',
                    10,
                    '#f59e0b',
                    20,
                    '#ef4444'
                ],
                'circle-radius': [
                    'step',
                    ['get', 'point_count'],
                    20,
                    10,
                    30,
                    20,
                    40
                ],
                'circle-stroke-width': 3,
                'circle-stroke-color': '#ffffff'
            }
        });

        // Cluster count labels
        this.map.addLayer({
            id: 'cluster-count',
            type: 'symbol',
            source: 'collectors',
            filter: ['has', 'point_count'],
            layout: {
                'text-field': '{point_count_abbreviated}',
                'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                'text-size': 12
            },
            paint: {
                'text-color': '#ffffff'
            }
        });

        // Individual collectors
        this.map.addLayer({
            id: 'unclustered-point',
            type: 'circle',
            source: 'collectors',
            filter: ['!', ['has', 'point_count']],
            paint: {
                'circle-color': [
                    'interpolate',
                    ['linear'],
                    ['get', 'totalMinerals'],
                    0, '#10b981',
                    30, '#f59e0b',
                    60, '#ef4444'
                ],
                'circle-radius': [
                    'interpolate',
                    ['linear'],
                    ['get', 'totalMinerals'],
                    0, 8,
                    100, 20
                ],
                'circle-stroke-width': 2,
                'circle-stroke-color': '#ffffff'
            }
        });

        // Add click handlers
        this.map.on('click', 'unclustered-point', (e) => {
            this.showCollectorPopup(e);
        });

        this.map.on('click', 'clusters', (e) => {
            this.handleClusterClick(e);
        });

        // Change cursor on hover
        this.map.on('mouseenter', 'unclustered-point', () => {
            this.map.getCanvas().style.cursor = 'pointer';
        });

        this.map.on('mouseleave', 'unclustered-point', () => {
            this.map.getCanvas().style.cursor = '';
        });
    }

    addCollectionLayers() {
        // Collection area fills
        this.map.addLayer({
            id: 'collection-areas-fill',
            type: 'fill',
            source: 'collection-areas',
            layout: {
                visibility: 'none'
            },
            paint: {
                'fill-color': [
                    'interpolate',
                    ['linear'],
                    ['get', 'intensity'],
                    0.3, 'rgba(16, 185, 129, 0.3)',
                    0.5, 'rgba(245, 158, 11, 0.4)',
                    0.7, 'rgba(239, 68, 68, 0.5)',
                    1.0, 'rgba(239, 68, 68, 0.6)'
                ],
                'fill-outline-color': [
                    'interpolate',
                    ['linear'],
                    ['get', 'intensity'],
                    0.3, '#10b981',
                    0.5, '#f59e0b',
                    0.7, '#ef4444',
                    1.0, '#ef4444'
                ]
            }
        });

        console.log('Collection areas layer added with data:', this.createCollectionAreasGeoJSON());

        // Collection area borders
        this.map.addLayer({
            id: 'collection-areas-line',
            type: 'line',
            source: 'collection-areas',
            layout: {
                visibility: 'none'
            },
            paint: {
                'line-color': [
                    'interpolate',
                    ['linear'],
                    ['get', 'intensity'],
                    0.3, '#10b981',
                    0.5, '#f59e0b',
                    0.7, '#ef4444',
                    1.0, '#ef4444'
                ],
                'line-width': 3,
                'line-opacity': 0.8
            }
        });

        // Add click handler for collection areas
        this.map.on('click', 'collection-areas-fill', (e) => {
            console.log('Collection area fill clicked', e);
            this.showCollectionPopup(e);
        });

        // Also add click handler for collection area lines as backup
        this.map.on('click', 'collection-areas-line', (e) => {
            console.log('Collection area line clicked', e);
            this.showCollectionPopup(e);
        });

        // Change cursor on hover for collection areas
        this.map.on('mouseenter', 'collection-areas-fill', () => {
            this.map.getCanvas().style.cursor = 'pointer';
        });

        this.map.on('mouseleave', 'collection-areas-fill', () => {
            this.map.getCanvas().style.cursor = '';
        });

        this.map.on('mouseenter', 'collection-areas-line', () => {
            this.map.getCanvas().style.cursor = 'pointer';
        });

        this.map.on('mouseleave', 'collection-areas-line', () => {
            this.map.getCanvas().style.cursor = '';
        });
    }

    showCollectorPopup(e) {
        const properties = e.features[0].properties;
        const minerals = JSON.parse(properties.minerals || '[]');
        
        const popup = new mapboxgl.Popup({ 
            offset: 25,
            className: 'modern-popup'
        })
            .setLngLat(e.lngLat)
            .setHTML(`
                <div class="modern-popup-content">
                    <div class="popup-header">
                        <div class="profile-image">
                            <img src="${properties.profileImage}" alt="${properties.name}" onerror="this.src='https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'">
                        </div>
                        <div class="profile-info">
                            <h3>${properties.name}</h3>
                            <p class="location">${properties.location}</p>
                            <div class="specialization-badge">${properties.specialization}</div>
                        </div>
                    </div>
                    
                    <div class="popup-stats">
                        <div class="stat-group">
                            <div class="stat">
                                <span class="stat-number">${properties.totalMinerals}</span>
                                <span class="stat-label">Minerals</span>
                            </div>
                            <div class="stat">
                                <span class="stat-number">${properties.rareFinds}</span>
                                <span class="stat-label">Rare Finds</span>
                            </div>
                            <div class="stat">
                                <span class="stat-number">${properties.yearsCollecting}</span>
                                <span class="stat-label">Years</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="popup-details">
                        <div class="favorite-mineral">
                            <strong>Favorite:</strong> ${properties.favoriteMineral}
                        </div>
                        <p class="bio">${properties.bio}</p>
                        
                        <div class="mineral-collection">
                            <h4>Recent Finds</h4>
                            <div class="mineral-tags">
                                ${minerals.slice(0, 6).map(mineral => `<span class="mineral-chip">${mineral}</span>`).join('')}
                                ${minerals.length > 6 ? `<span class="mineral-chip more">+${minerals.length - 6} more</span>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `)
            .addTo(this.map);
    }

    showCollectionPopup(e) {
        if (!e.features || e.features.length === 0) {
            console.error('No features found in click event');
            return;
        }

        const properties = e.features[0].properties;
        if (!properties) {
            console.error('No properties found in feature');
            return;
        }

        console.log('Collection area clicked:', properties);
        
        const minerals = JSON.parse(properties.minerals || '[]');
        
        // Open the sliding panel instead of popup
        this.openCollectionPanel(properties, minerals);
    }

    openCollectionPanel(properties, minerals) {
        console.log('Opening collection panel with data:', properties, minerals);
        
        const panel = document.getElementById('collectionPanel');
        const title = document.getElementById('panelStateTitle');
        const subtitle = document.getElementById('panelStateSubtitle');
        const mineralCount = document.getElementById('panelMineralCount');
        const speciesCount = document.getElementById('panelSpeciesCount');
        const focusBadge = document.getElementById('panelFocusBadge');
        const description = document.getElementById('panelDescription');
        const container = document.getElementById('mineralsContainer');

        if (!panel) {
            console.error('Collection panel element not found!');
            return;
        }

        console.log('Panel found, updating content...');

        // Calculate focus percentage based on total collection
        const totalCollectionMinerals = this.personalCollection.totalMinerals;
        const stateCollectionMinerals = properties.mineralCount;
        const focusPercentage = Math.round((stateCollectionMinerals / totalCollectionMinerals) * 100);

        // Update panel content
        if (title) title.textContent = `${properties.state} Collection`;
        if (subtitle) subtitle.textContent = `${properties.name} • ${properties.state}`;
        if (mineralCount) mineralCount.textContent = properties.mineralCount;
        if (speciesCount) speciesCount.textContent = minerals.length;
        if (focusBadge) focusBadge.textContent = `${focusPercentage}% of Collection`;
        if (description) description.textContent = properties.description;

        // Generate mineral cards
        if (container) {
            container.innerHTML = minerals.map(mineral => this.createMineralCard(mineral)).join('');
            console.log('Generated mineral cards:', minerals.length);
        }

        // Force initial state and repaint
        panel.classList.remove('open');
        panel.style.left = '100%';
        
        // Force repaint
        requestAnimationFrame(() => {
            panel.offsetHeight; // Force layout calculation
            
            // Show panel with animation
            console.log('Adding open class to panel...');
            panel.classList.add('open');
            
            // Also set inline style as backup
            setTimeout(() => {
                panel.style.left = 'calc(100% - 450px)';
            }, 50);
            
            console.log('Panel classes:', panel.className);
            console.log('Panel computed left:', window.getComputedStyle(panel).left);
        });
    }

    closeCollectionPanel() {
        const panel = document.getElementById('collectionPanel');
        panel.classList.remove('open');
        // Also reset inline styles
        setTimeout(() => {
            panel.style.left = '100%';
        }, 400); // Wait for transition to complete
    }

    createMineralCard(mineralName) {
        // Generate realistic mineral data
        const mineralData = this.getMineralData(mineralName);
        
        return `
            <div class="mineral-card">
                <div class="mineral-rarity rarity-${mineralData.rarity}">
                    ${mineralData.rarity.replace('-', ' ')}
                </div>
                
                <div class="mineral-image">
                    <img src="${mineralData.image}" alt="${mineralName}" onerror="this.src='https://images.unsplash.com/photo-1518281420975-50db6e5d0a97?w=300&h=200&fit=crop'">
                </div>
                
                <div class="mineral-card-header">
                    <div class="mineral-icon">
                        ${mineralData.icon}
                    </div>
                    <h3 class="mineral-name">${mineralName}</h3>
                </div>
                
                <div class="mineral-details">
                    <div class="mineral-detail">
                        <span class="detail-label">Formula</span>
                        <span class="detail-value">${mineralData.formula}</span>
                    </div>
                    <div class="mineral-detail">
                        <span class="detail-label">System</span>
                        <span class="detail-value">${mineralData.system}</span>
                    </div>
                    <div class="mineral-detail">
                        <span class="detail-label">Hardness</span>
                        <span class="detail-value">${mineralData.hardness}</span>
                    </div>
                    <div class="mineral-detail">
                        <span class="detail-label">Color</span>
                        <span class="detail-value">${mineralData.color}</span>
                    </div>
                </div>
            </div>
        `;
    }

    getMineralData(mineralName) {
        // Comprehensive mineral database with realistic data and photos
        const mineralDatabase = {
            "Amethyst": { formula: "SiO₂", system: "Hexagonal", hardness: "7", color: "Purple", icon: "💜", rarity: "common", image: "https://images.unsplash.com/photo-1518281420975-50db6e5d0a97?w=300&h=200&fit=crop" },
            "Citrine": { formula: "SiO₂", system: "Hexagonal", hardness: "7", color: "Yellow", icon: "💛", rarity: "common", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=200&fit=crop" },
            "Rose Quartz": { formula: "SiO₂", system: "Hexagonal", hardness: "7", color: "Pink", icon: "🌸", rarity: "common", image: "https://images.unsplash.com/photo-1540979388789-6cee28a1cdc9?w=300&h=200&fit=crop" },
            "Smoky Quartz": { formula: "SiO₂", system: "Hexagonal", hardness: "7", color: "Gray-Brown", icon: "🖤", rarity: "common", image: "https://images.unsplash.com/photo-1602934445884-da0fa1c9d3b3?w=300&h=200&fit=crop" },
            "Clear Quartz": { formula: "SiO₂", system: "Hexagonal", hardness: "7", color: "Colorless", icon: "🤍", rarity: "common", image: "https://images.unsplash.com/photo-1518281420975-50db6e5d0a97?w=300&h=200&fit=crop" },
            "Rhodochrosite": { formula: "MnCO₃", system: "Hexagonal", hardness: "3.5-4", color: "Pink-Red", icon: "❤️", rarity: "uncommon", image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=200&fit=crop" },
            "Purple Fluorite": { formula: "CaF₂", system: "Cubic", hardness: "4", color: "Purple", icon: "💜", rarity: "common", image: "https://images.unsplash.com/photo-1605726663020-d4d2f8d4e0e9?w=300&h=200&fit=crop" },
            "Green Fluorite": { formula: "CaF₂", system: "Cubic", hardness: "4", color: "Green", icon: "💚", rarity: "common", image: "https://images.unsplash.com/photo-1615800001234-9fa25c2c1de2?w=300&h=200&fit=crop" },
            "Emerald": { formula: "Be₃Al₂Si₆O₁₈", system: "Hexagonal", hardness: "7.5-8", color: "Green", icon: "💚", rarity: "rare", image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=200&fit=crop" },
            "Hiddenite": { formula: "LiAlSi₂O₆", system: "Monoclinic", hardness: "6.5-7", color: "Green", icon: "💚", rarity: "very-rare", image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=200&fit=crop" },
            "Kunzite": { formula: "LiAlSi₂O₆", system: "Monoclinic", hardness: "6.5-7", color: "Pink", icon: "🌸", rarity: "rare", image: "https://images.unsplash.com/photo-1540979388789-6cee28a1cdc9?w=300&h=200&fit=crop" },
            "Aquamarine": { formula: "Be₃Al₂Si₆O₁₈", system: "Hexagonal", hardness: "7.5-8", color: "Blue", icon: "💙", rarity: "uncommon", image: "https://images.unsplash.com/photo-1544133566-6fb0dd1b9b8e?w=300&h=200&fit=crop" },
            "Turquoise": { formula: "CuAl₆(PO₄)₄(OH)₈·4H₂O", system: "Triclinic", hardness: "5-6", color: "Blue-Green", icon: "🐚", rarity: "uncommon", image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=200&fit=crop" },
            "Chrysocolla": { formula: "Cu₂H₂Si₂O₅(OH)₄", system: "Orthorhombic", hardness: "2-4", color: "Blue-Green", icon: "🌊", rarity: "common", image: "https://images.unsplash.com/photo-1615800001234-9fa25c2c1de2?w=300&h=200&fit=crop" },
            "Stilbite": { formula: "NaCa₂Al₅Si₁₃O₃₆·14H₂O", system: "Monoclinic", hardness: "3.5-4", color: "White-Pink", icon: "🤍", rarity: "common", image: "https://images.unsplash.com/photo-1518281420975-50db6e5d0a97?w=300&h=200&fit=crop" },
            "Heulandite": { formula: "Ca₄Al₈Si₂₈O₇₂·24H₂O", system: "Monoclinic", hardness: "3.5-4", color: "White-Red", icon: "❤️", rarity: "common", image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=200&fit=crop" },
            "Chabazite": { formula: "Ca₂Al₄Si₈O₂₄·12H₂O", system: "Hexagonal", hardness: "4-5", color: "White-Pink", icon: "🌸", rarity: "uncommon", image: "https://images.unsplash.com/photo-1540979388789-6cee28a1cdc9?w=300&h=200&fit=crop" },
            "Prehnite": { formula: "Ca₂Al₂Si₃O₁₀(OH)₂", system: "Orthorhombic", hardness: "6-6.5", color: "Green", icon: "💚", rarity: "common", image: "https://images.unsplash.com/photo-1615800001234-9fa25c2c1de2?w=300&h=200&fit=crop" },
            "Apophyllite": { formula: "KCa₄Si₈O₂₀(F,OH)·8H₂O", system: "Tetragonal", hardness: "4.5-5", color: "Colorless-White", icon: "🤍", rarity: "common", image: "https://images.unsplash.com/photo-1518281420975-50db6e5d0a97?w=300&h=200&fit=crop" },
            "Calcite": { formula: "CaCO₃", system: "Hexagonal", hardness: "3", color: "Variable", icon: "🪨", rarity: "common", image: "https://images.unsplash.com/photo-1602934445884-da0fa1c9d3b3?w=300&h=200&fit=crop" },
            "Agate": { formula: "SiO₂", system: "Hexagonal", hardness: "7", color: "Banded", icon: "🎨", rarity: "common", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=200&fit=crop" },
            "Jasper": { formula: "SiO₂", system: "Hexagonal", hardness: "7", color: "Red-Brown", icon: "🔴", rarity: "common", image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=200&fit=crop" },
            "Petrified Wood": { formula: "SiO₂", system: "Hexagonal", hardness: "7", color: "Brown", icon: "🪵", rarity: "common", image: "https://images.unsplash.com/photo-1602934445884-da0fa1c9d3b3?w=300&h=200&fit=crop" },
            "Thunder Eggs": { formula: "SiO₂", system: "Hexagonal", hardness: "7", color: "Variable", icon: "⚡", rarity: "uncommon", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=200&fit=crop" },
            "Pyrite": { formula: "FeS₂", system: "Cubic", hardness: "6-6.5", color: "Gold", icon: "🟨", rarity: "common", image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=200&fit=crop" },
            "Galena": { formula: "PbS", system: "Cubic", hardness: "2.5", color: "Silver-Gray", icon: "⚫", rarity: "common", image: "https://images.unsplash.com/photo-1602934445884-da0fa1c9d3b3?w=300&h=200&fit=crop" },
            "Sphalerite": { formula: "ZnS", system: "Cubic", hardness: "3.5-4", color: "Brown-Black", icon: "🟤", rarity: "common", image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=200&fit=crop" },
            "Morganite": { formula: "Be₃Al₂Si₆O₁₈", system: "Hexagonal", hardness: "7.5-8", color: "Pink", icon: "🌸", rarity: "uncommon", image: "https://images.unsplash.com/photo-1540979388789-6cee28a1cdc9?w=300&h=200&fit=crop" },
            "Beryl": { formula: "Be₃Al₂Si₆O₁₈", system: "Hexagonal", hardness: "7.5-8", color: "Variable", icon: "💎", rarity: "uncommon", image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=300&h=200&fit=crop" },
            "Chalcedony": { formula: "SiO₂", system: "Hexagonal", hardness: "7", color: "Blue-White", icon: "💎", rarity: "common", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=200&fit=crop" },
            "Carnelian": { formula: "SiO₂", system: "Hexagonal", hardness: "7", color: "Orange-Red", icon: "🔶", rarity: "common", image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=200&fit=crop" },
            "Chrysoprase": { formula: "SiO₂", system: "Hexagonal", hardness: "7", color: "Green", icon: "💚", rarity: "common", image: "https://images.unsplash.com/photo-1615800001234-9fa25c2c1de2?w=300&h=200&fit=crop" },
            "Bloodstone": { formula: "SiO₂", system: "Hexagonal", hardness: "7", color: "Green-Red", icon: "🩸", rarity: "common", image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=200&fit=crop" },
            "Moss Agate": { formula: "SiO₂", system: "Hexagonal", hardness: "7", color: "Green-White", icon: "🌿", rarity: "common", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=200&fit=crop" },
            "Garnet": { formula: "X₃Y₂(SiO₄)₃", system: "Cubic", hardness: "6.5-7.5", color: "Red", icon: "💎", rarity: "common", image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=200&fit=crop" },
            "Ruby": { formula: "Al₂O₃", system: "Hexagonal", hardness: "9", color: "Red", icon: "💎", rarity: "rare", image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=200&fit=crop" },
            "Sapphire": { formula: "Al₂O₃", system: "Hexagonal", hardness: "9", color: "Blue", icon: "💎", rarity: "rare", image: "https://images.unsplash.com/photo-1544133566-6fb0dd1b9b8e?w=300&h=200&fit=crop" },
            "Moonstone": { formula: "KAlSi₃O₈", system: "Monoclinic", hardness: "6", color: "White-Blue", icon: "🌙", rarity: "uncommon", image: "https://images.unsplash.com/photo-1518281420975-50db6e5d0a97?w=300&h=200&fit=crop" },
            "Sunstone": { formula: "NaAlSi₃O₈", system: "Triclinic", hardness: "6", color: "Orange", icon: "☀️", rarity: "uncommon", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=200&fit=crop" },
            "Quartz": { formula: "SiO₂", system: "Hexagonal", hardness: "7", color: "Clear", icon: "💎", rarity: "common", image: "https://images.unsplash.com/photo-1518281420975-50db6e5d0a97?w=300&h=200&fit=crop" },
            "Azurite": { formula: "Cu₃(CO₃)₂(OH)₂", system: "Monoclinic", hardness: "3.5-4", color: "Blue", icon: "💙", rarity: "uncommon", image: "https://images.unsplash.com/photo-1544133566-6fb0dd1b9b8e?w=300&h=200&fit=crop" },
            "Malachite": { formula: "Cu₂CO₃(OH)₂", system: "Monoclinic", hardness: "3.5-4", color: "Green", icon: "💚", rarity: "common", image: "https://images.unsplash.com/photo-1615800001234-9fa25c2c1de2?w=300&h=200&fit=crop" },
            "Cuprite": { formula: "Cu₂O", system: "Cubic", hardness: "3.5-4", color: "Red", icon: "🔴", rarity: "uncommon", image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=200&fit=crop" },
            "Wulfenite": { formula: "PbMoO₄", system: "Tetragonal", hardness: "3", color: "Orange-Yellow", icon: "🟠", rarity: "uncommon", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=300&h=200&fit=crop" },
            "Vanadinite": { formula: "Pb₅(VO₄)₃Cl", system: "Hexagonal", hardness: "3", color: "Red-Orange", icon: "🔶", rarity: "uncommon", image: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=200&fit=crop" },
            "Dioptase": { formula: "CuSiO₃·H₂O", system: "Hexagonal", hardness: "5", color: "Green", icon: "💚", rarity: "rare", image: "https://images.unsplash.com/photo-1615800001234-9fa25c2c1de2?w=300&h=200&fit=crop" }
        };

        return mineralDatabase[mineralName] || {
            formula: "Unknown",
            system: "Unknown",
            hardness: "Unknown",
            color: "Unknown",
            icon: "💎",
            rarity: "common",
            image: "https://images.unsplash.com/photo-1518281420975-50db6e5d0a97?w=300&h=200&fit=crop"
        };
    }

    handleClusterClick(e) {
        const clusterId = e.features[0].properties.cluster_id;
        this.map.getSource('collectors').getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (!err) {
                this.map.easeTo({
                    center: e.features[0].geometry.coordinates,
                    zoom: zoom + 1
                });
            }
        });
    }

    setupEventListeners() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // View toggle
        document.getElementById('viewToggle').addEventListener('change', (e) => {
            this.isCollectionView = e.target.checked;
            this.updateViewMode();
        });

        // Close panel button
        document.getElementById('closePanelBtn').addEventListener('click', () => {
            this.closeCollectionPanel();
        });

        // Close panel when clicking outside (optional)
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('collectionPanel');
            const isClickInsidePanel = panel.contains(e.target);
            const isClickOnState = e.target.closest('.collection-areas-fill');
            
            if (panel.classList.contains('open') && !isClickInsidePanel && !isClickOnState) {
                this.closeCollectionPanel();
            }
        });

    }

    updateGlobeAtmosphere() {
        if (this.isDarkMode) {
            // Dark mode atmosphere
            this.map.setFog({
                'range': [0.8, 8],
                'color': '#1a1a1a',
                'horizon-blend': 0.1,
                'high-color': '#000000',
                'space-color': '#000000',
                'star-intensity': 0.6
            });
        } else {
            // Light mode atmosphere
            this.map.setFog({
                'range': [0.8, 8],
                'color': '#ffffff',
                'horizon-blend': 0.1,
                'high-color': '#87ceeb',
                'space-color': '#87ceeb',
                'star-intensity': 0.0
            });
        }
    }

    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        const body = document.body;
        const themeIcon = document.querySelector('#themeToggle i');
        
        if (this.isDarkMode) {
            body.setAttribute('data-theme', 'dark');
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
            this.map.setStyle('mapbox://styles/mapbox/dark-v11');
        } else {
            body.removeAttribute('data-theme');
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
            this.map.setStyle('mapbox://styles/mapbox/light-v11');
        }

        // Recreate layers and update atmosphere after style change
        this.map.once('style.load', () => {
            this.updateGlobeAtmosphere();
            this.setupDataSources();
        });
    }

    updateViewMode() {
        const totalCollectors = document.getElementById('totalCollectors');
        const totalMinerals = document.getElementById('totalMinerals');
        
        console.log('Updating view mode. Collection view:', this.isCollectionView);
        
        if (this.isCollectionView) {
            // Show personal collection view
            totalCollectors.textContent = this.personalCollection.focusAreas.length;
            totalMinerals.textContent = this.personalCollection.totalMinerals;
            
            // Hide collector layers (check if they exist first)
            this.setLayerVisibility('clusters', 'none');
            this.setLayerVisibility('cluster-count', 'none');
            this.setLayerVisibility('unclustered-point', 'none');
            
            // Show collection layers (check if they exist first)
            this.setLayerVisibility('collection-areas-fill', 'visible');
            this.setLayerVisibility('collection-areas-line', 'visible');
            
            console.log('Collection layers should now be visible');
        } else {
            // Show global collectors view
            totalCollectors.textContent = this.stats.totalCollectors;
            totalMinerals.textContent = this.stats.totalMinerals;
            
            // Show collector layers (check if they exist first)
            this.setLayerVisibility('clusters', 'visible');
            this.setLayerVisibility('cluster-count', 'visible');
            this.setLayerVisibility('unclustered-point', 'visible');
            
            // Hide collection layers (check if they exist first)
            this.setLayerVisibility('collection-areas-fill', 'none');
            this.setLayerVisibility('collection-areas-line', 'none');
        }
    }

    setLayerVisibility(layerId, visibility) {
        if (this.map.getLayer(layerId)) {
            this.map.setLayoutProperty(layerId, 'visibility', visibility);
        }
    }

    loadCollectors() {
        // Update statistics
        document.getElementById('totalCountries').textContent = this.stats.totalCountries;
    }

    hideLoadingScreen() {
        setTimeout(() => {
            const loadingScreen = document.getElementById('loadingScreen');
            loadingScreen.classList.add('hidden');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }, 2000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MineralCollectorMap();
});

// Handle window resize
window.addEventListener('resize', () => {
    if (window.mineralMap && window.mineralMap.map) {
        window.mineralMap.map.resize();
    }
});
