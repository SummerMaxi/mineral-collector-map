# Mineral Collector Globe

A modern, interactive 3D globe application for exploring mineral collectors and their collections worldwide.

## Features

- **3D Globe Visualization**: Google Earth-style globe with smooth zoom and projection transitions
- **Dual View Modes**:
  - **Collectors View**: Explore 30+ mineral collectors worldwide with detailed profiles
  - **My Collection View**: Visualize your personal collection focus areas with heatmap overlays
- **Dark/Light Mode**: Toggle between modern dark and light themes
- **Interactive Elements**:
  - Clickable collector markers with detailed popups
  - Cluster visualization for dense areas
  - Collection area highlights with intensity mapping
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Quick Start

1. **Get a Mapbox Access Token**:
   - Sign up at [mapbox.com](https://www.mapbox.com/)
   - Create a new access token from [Mapbox Account](https://account.mapbox.com/access-tokens/)

2. **Configure Environment**:
   ```bash
   # Copy the example environment file
   cp .env.example .env
   ```
   
   Edit `.env` and add your Mapbox token:
   ```
   MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
   DEFAULT_THEME=dark
   ```

3. **Open the Application**:
   ```bash
   # Simply open index.html in your browser
   open index.html
   ```

4. **For Local Development** (recommended):
   ```bash
   # Using Python 3
   python -m http.server 8000
   
   # Using Node.js
   npx http-server
   
   # Then visit http://localhost:8000
   ```

## Deployment

### Vercel (Recommended)
1. Push your code to a GitHub repository
2. Connect your repository to [Vercel](https://vercel.com)
3. In Vercel dashboard, go to your project Settings > Environment Variables
4. Add the following environment variables:
   ```
   MAPBOX_ACCESS_TOKEN=your_actual_mapbox_token_here
   DEFAULT_THEME=dark
   ```
5. Redeploy your project - Vercel will run the build script to inject your environment variables

### GitHub Pages
1. Push your code to a GitHub repository (the `.env` file will be automatically excluded via `.gitignore`)
2. **Important**: Before enabling GitHub Pages, you need to manually update `config.js` with your Mapbox token since GitHub Pages doesn't support environment variables
3. Go to Settings > Pages in your GitHub repository  
4. Select "Deploy from a branch" and choose your main branch
5. Your site will be available at `https://yourusername.github.io/repository-name`

### Netlify
1. Connect your GitHub repository to [Netlify](https://netlify.com)
2. In Netlify dashboard, go to Site Settings > Environment Variables
3. Add your environment variables:
   ```
   MAPBOX_ACCESS_TOKEN=your_actual_mapbox_token_here
   DEFAULT_THEME=dark
   ```
4. Set the build command to: `node build.js`
5. Redeploy your site

### Other Static Hosting Services
For platforms that support build commands and environment variables:
- **Firebase Hosting**: Use Firebase CLI with build script
- **AWS Amplify**: Connect GitHub repo and set environment variables

**Security Note**: Your API keys are never committed to git thanks to the build script system. Environment variables are injected during deployment only.

## Usage

### Navigation
- **Zoom**: Mouse wheel or zoom controls
- **Pan**: Click and drag
- **Globe/Map**: Automatically switches between globe projection (zoomed out) and Mercator (zoomed in)

### View Modes
- **Toggle Switch**: Switch between "Collectors" and "My Collection" views
- **Collectors View**: Shows global mineral collectors as interactive markers
- **Collection View**: Displays your personal collection focus areas as highlighted regions

### Themes
- **Theme Button**: Click the moon/sun icon to toggle between dark and light modes
- **Automatic Styling**: Map style changes to match theme

## Data Structure

### Collector Data
Each collector includes:
- Personal information (name, location, bio)
- Collection details (specialization, total minerals, rare finds)
- Geographic coordinates
- Specific mineral list

### Collection Areas
Personal collection areas feature:
- Geographic boundaries
- Collection intensity levels
- Mineral counts per area
- Descriptive information

## Customization

### Adding New Collectors
Edit `data.js` and add entries to the `mineralCollectors` array:

```javascript
{
    id: 31,
    name: "Your Name",
    location: "Your City, Country",
    coordinates: [longitude, latitude],
    country: "Your Country",
    specialization: "Your Specialty",
    totalMinerals: 50,
    rareFinds: 10,
    yearsCollecting: 15,
    favoriteMineral: "Your Favorite",
    bio: "Your bio",
    minerals: ["Mineral1", "Mineral2", "..."]
}
```

### Modifying Collection Areas
Update the `personalCollection.focusAreas` array in `data.js`:

```javascript
{
    name: "Your Collection Area",
    center: [longitude, latitude],
    radius: 200000, // in meters
    intensity: 0.8, // 0.0 to 1.0
    mineralCount: 25,
    description: "Description of your focus"
}
```

### Styling
- Modify `styles.css` for visual customization
- Update CSS custom properties in `:root` for color themes
- Adjust responsive breakpoints in media queries

## Technologies Used

- **Mapbox GL JS**: 3D globe and map rendering
- **Vanilla JavaScript**: No framework dependencies
- **CSS Custom Properties**: Theme system
- **Font Awesome**: Icons
- **GeoJSON**: Geographic data format

## Browser Support

- Chrome 79+
- Firefox 70+
- Safari 13+
- Edge 79+

## License

Open source - feel free to use and modify for your mineral collecting community!

---

**Note**: This application uses Mapbox GL JS which requires a free API token. Get your token from [Mapbox Account](https://account.mapbox.com/access-tokens/) and configure it in your `.env` file for local development or `config.js` for production deployment.