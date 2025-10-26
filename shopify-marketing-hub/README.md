# Shopify Marketing Hub

A powerful React-based dashboard application designed to help Shopify store owners drive traffic and increase sales through data-driven marketing insights and automated content generation.

## Features

### Current Features (MVP)
- **Dashboard Overview**: Real-time statistics on visitors, conversion rates, orders, and revenue
- **Analytics Dashboard**:
  - Interactive charts for traffic and sales data
  - Traffic source breakdown
  - Key insights and performance metrics
- **Social Media Post Generator**:
  - Generate engaging posts for Instagram, Facebook, and Twitter
  - Product-specific content creation
  - Platform-optimized messaging
  - Copy-to-clipboard functionality
- **Settings Panel**:
  - Shopify store integration
  - Notification preferences
  - Account management

### Roadmap Features
- AI-powered content generation
- Automated social media scheduling
- Competitor analysis
- SEO optimization tools
- Email marketing integration
- Multi-store management
- Team collaboration features

## Tech Stack

- **Frontend**: React 18
- **Build Tool**: Vite
- **Routing**: React Router v6
- **Charts**: Chart.js with react-chartjs-2
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Styling**: CSS3 with modern gradients and animations

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A Shopify store (for production use)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/shopify-marketing-hub.git
cd shopify-marketing-hub
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
shopify-marketing-hub/
├── src/
│   ├── components/         # Reusable components
│   │   ├── Layout.jsx     # Main layout with navigation
│   │   └── Layout.css
│   ├── pages/             # Page components
│   │   ├── Dashboard.jsx
│   │   ├── Analytics.jsx
│   │   ├── SocialMediaGenerator.jsx
│   │   └── Settings.jsx
│   ├── services/          # API services
│   │   └── shopifyService.js
│   ├── utils/             # Utility functions
│   ├── context/           # React context providers
│   ├── App.jsx           # Main app component
│   ├── App.css
│   ├── index.css
│   └── main.jsx
├── public/                # Static assets
├── package.json
└── README.md
```

## Shopify Integration

### Setting Up Shopify API

1. Go to your Shopify Admin Panel
2. Navigate to `Settings > Apps and sales channels > Develop apps`
3. Click "Create an app"
4. Give it a name (e.g., "Marketing Hub")
5. Configure Admin API scopes:
   - `read_products`
   - `read_orders`
   - `read_customers`
   - `read_analytics`
6. Install the app and get your access token
7. Add credentials to Settings page in the app

### Environment Variables (Optional)

Create a `.env` file in the root directory:

```env
VITE_SHOPIFY_STORE_URL=your-store.myshopify.com
VITE_SHOPIFY_ACCESS_TOKEN=your_access_token_here
```

## Usage Guide

### Dashboard
- View key metrics at a glance
- Monitor recent activity
- Quick access to main features

### Analytics
- Track website traffic trends
- Monitor sales performance
- Analyze traffic sources
- Get actionable insights

### Social Media Generator
1. Select a product from your store
2. Choose your target platform (Instagram, Facebook, Twitter)
3. Click "Generate Post"
4. Copy and paste to your social media

### Settings
- Connect your Shopify store
- Configure notification preferences
- Update account information

## Monetization Strategy

### Pricing Tiers

**Free Plan**
- Basic analytics
- Manual post generation
- Up to 10 posts/month

**Pro Plan ($29/month)**
- Advanced analytics
- AI-powered content
- Unlimited posts
- Schedule posts
- Email support

**Enterprise Plan ($99/month)**
- Everything in Pro
- Multi-store support
- Team collaboration
- Priority support
- Custom integrations
- White-labeling options

## Contributing

This is a starter project. Feel free to:
- Add new features
- Improve existing functionality
- Fix bugs
- Enhance UI/UX

## Future Enhancements

1. **Phase 1**: Shopify API integration with real data
2. **Phase 2**: AI content generation (OpenAI integration)
3. **Phase 3**: Social media scheduling automation
4. **Phase 4**: Email marketing campaigns
5. **Phase 5**: Competitor tracking
6. **Phase 6**: Mobile app (React Native)

## License

MIT License - Feel free to use this project for your own purposes

## Support

For help with your brother's store:
1. Connect the Shopify store in Settings
2. Start generating social posts to drive traffic
3. Monitor analytics to see what's working
4. Iterate and improve based on data

## Acknowledgments

- Built with React and Vite
- Icons by Lucide
- Charts by Chart.js
- Designed for Shopify store owners

---

**Built to help small businesses grow their online presence and drive more traffic to their stores.**
