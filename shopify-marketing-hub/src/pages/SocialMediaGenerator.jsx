import { useState } from 'react';
import { Copy, Download, RefreshCw, Instagram, Facebook, Twitter } from 'lucide-react';
import './SocialMediaGenerator.css';

const SocialMediaGenerator = () => {
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('instagram');
  const [generatedPost, setGeneratedPost] = useState('');
  const [loading, setLoading] = useState(false);

  // Mock product data - would come from Shopify API
  const products = [
    { id: 1, name: 'Premium Wireless Headphones', price: '$99.99' },
    { id: 2, name: 'Smart Watch Pro', price: '$299.99' },
    { id: 3, name: 'Laptop Stand', price: '$49.99' },
    { id: 4, name: 'USB-C Hub', price: '$39.99' }
  ];

  const platforms = [
    { id: 'instagram', name: 'Instagram', icon: Instagram, color: '#E1306C' },
    { id: 'facebook', name: 'Facebook', icon: Facebook, color: '#1877F2' },
    { id: 'twitter', name: 'Twitter', icon: Twitter, color: '#1DA1F2' }
  ];

  const generatePost = () => {
    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      const product = products.find(p => p.id === parseInt(selectedProduct));

      const posts = {
        instagram: `✨ NEW ARRIVAL ✨

Introducing ${product.name}!

🎯 Premium quality at just ${product.price}
💯 Limited stock available
🚀 Free shipping on orders over $50

Tap the link in bio to shop now!

#NewArrival #${product.name.replace(/\s+/g, '')} #ShopNow #OnlineShopping #TechGadgets`,

        facebook: `🎉 Exciting News!

We just added ${product.name} to our store!

Why you'll love it:
✅ High quality materials
✅ Affordable price (${product.price})
✅ Fast & free shipping
✅ 30-day money-back guarantee

Click the link below to get yours today! Limited quantities available.

👇 Shop Now 👇`,

        twitter: `🔥 NEW: ${product.name} now available!

💰 Only ${product.price}
🚚 Free shipping
⭐ Premium quality

Shop now before they're gone!

#NewProduct #TechDeals #ShopSmall`
      };

      setGeneratedPost(posts[selectedPlatform]);
      setLoading(false);
    }, 1000);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPost);
    alert('Post copied to clipboard!');
  };

  return (
    <div className="social-media-generator">
      <div className="generator-header">
        <h1>Social Media Post Generator</h1>
        <p>Create engaging posts for your products in seconds</p>
      </div>

      <div className="generator-layout">
        <div className="generator-form">
          <div className="form-section">
            <h3>Select Product</h3>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="product-select"
            >
              <option value="">Choose a product...</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name} - {product.price}
                </option>
              ))}
            </select>
          </div>

          <div className="form-section">
            <h3>Select Platform</h3>
            <div className="platform-grid">
              {platforms.map(platform => {
                const Icon = platform.icon;
                return (
                  <button
                    key={platform.id}
                    className={`platform-btn ${selectedPlatform === platform.id ? 'active' : ''}`}
                    onClick={() => setSelectedPlatform(platform.id)}
                  >
                    <Icon size={24} color={platform.color} />
                    <span>{platform.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            className="generate-btn"
            onClick={generatePost}
            disabled={!selectedProduct || loading}
          >
            {loading ? (
              <>
                <RefreshCw size={20} className="spinning" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw size={20} />
                Generate Post
              </>
            )}
          </button>
        </div>

        <div className="preview-section">
          <div className="preview-header">
            <h3>Preview</h3>
            {generatedPost && (
              <div className="preview-actions">
                <button className="action-btn" onClick={copyToClipboard}>
                  <Copy size={18} />
                  Copy
                </button>
                <button className="action-btn">
                  <Download size={18} />
                  Download
                </button>
              </div>
            )}
          </div>

          <div className="preview-content">
            {generatedPost ? (
              <div className="generated-post">
                <div className="post-platform-badge" style={{
                  backgroundColor: platforms.find(p => p.id === selectedPlatform)?.color
                }}>
                  {platforms.find(p => p.id === selectedPlatform)?.name}
                </div>
                <pre>{generatedPost}</pre>
              </div>
            ) : (
              <div className="preview-placeholder">
                <RefreshCw size={48} color="#cbd5e0" />
                <p>Select a product and platform to generate a post</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="tips-section">
        <h3>Pro Tips for Social Media Marketing</h3>
        <div className="tips-grid">
          <div className="tip-card">
            <h4>Best Posting Times</h4>
            <p>Instagram: 11 AM - 1 PM</p>
            <p>Facebook: 1 PM - 3 PM</p>
            <p>Twitter: 9 AM - 11 AM</p>
          </div>
          <div className="tip-card">
            <h4>Use Hashtags Wisely</h4>
            <p>Instagram: 11-15 hashtags</p>
            <p>Facebook: 2-3 hashtags</p>
            <p>Twitter: 1-2 hashtags</p>
          </div>
          <div className="tip-card">
            <h4>Engage Your Audience</h4>
            <p>Ask questions</p>
            <p>Use call-to-actions</p>
            <p>Respond to comments quickly</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialMediaGenerator;
