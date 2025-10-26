import { useState } from 'react';
import { Save, Link, Bell, User } from 'lucide-react';
import './Settings.css';

const Settings = () => {
  const [shopifyStore, setShopifyStore] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [connected, setConnected] = useState(false);

  const handleConnect = (e) => {
    e.preventDefault();
    // In real app, this would connect to Shopify API
    if (shopifyStore && apiKey) {
      setConnected(true);
      alert('Successfully connected to Shopify!');
    }
  };

  return (
    <div className="settings">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Manage your account and Shopify integration</p>
      </div>

      <div className="settings-sections">
        <div className="settings-card">
          <div className="card-header">
            <Link size={24} color="#667eea" />
            <h2>Shopify Integration</h2>
          </div>

          <form onSubmit={handleConnect} className="settings-form">
            <div className="form-group">
              <label>Store URL</label>
              <input
                type="text"
                placeholder="your-store.myshopify.com"
                value={shopifyStore}
                onChange={(e) => setShopifyStore(e.target.value)}
                className="form-input"
              />
              <span className="form-hint">Enter your Shopify store URL</span>
            </div>

            <div className="form-group">
              <label>API Key</label>
              <input
                type="password"
                placeholder="Enter your Shopify API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="form-input"
              />
              <span className="form-hint">
                <a href="https://admin.shopify.com/settings/apps/development" target="_blank" rel="noopener noreferrer">
                  Get your API key from Shopify Admin
                </a>
              </span>
            </div>

            {connected && (
              <div className="connection-status connected">
                ✓ Connected to Shopify
              </div>
            )}

            <button type="submit" className="save-btn">
              <Save size={20} />
              {connected ? 'Update Connection' : 'Connect to Shopify'}
            </button>
          </form>
        </div>

        <div className="settings-card">
          <div className="card-header">
            <Bell size={24} color="#667eea" />
            <h2>Notifications</h2>
          </div>

          <div className="settings-form">
            <div className="checkbox-group">
              <label className="checkbox-label">
                <input type="checkbox" defaultChecked />
                <span>Email notifications for new orders</span>
              </label>
            </div>

            <div className="checkbox-group">
              <label className="checkbox-label">
                <input type="checkbox" defaultChecked />
                <span>Traffic spike alerts</span>
              </label>
            </div>

            <div className="checkbox-group">
              <label className="checkbox-label">
                <input type="checkbox" />
                <span>Weekly performance reports</span>
              </label>
            </div>

            <div className="checkbox-group">
              <label className="checkbox-label">
                <input type="checkbox" />
                <span>Social media post reminders</span>
              </label>
            </div>

            <button className="save-btn">
              <Save size={20} />
              Save Preferences
            </button>
          </div>
        </div>

        <div className="settings-card">
          <div className="card-header">
            <User size={24} color="#667eea" />
            <h2>Account Information</h2>
          </div>

          <div className="settings-form">
            <div className="form-group">
              <label>Business Name</label>
              <input
                type="text"
                placeholder="Your business name"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                placeholder="your@email.com"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Plan</label>
              <div className="plan-info">
                <span className="plan-badge">Free Plan</span>
                <button className="upgrade-btn">Upgrade to Pro</button>
              </div>
            </div>

            <button className="save-btn">
              <Save size={20} />
              Update Account
            </button>
          </div>
        </div>
      </div>

      <div className="danger-zone">
        <h3>Danger Zone</h3>
        <p>Permanently delete your account and all associated data</p>
        <button className="delete-btn">Delete Account</button>
      </div>
    </div>
  );
};

export default Settings;
