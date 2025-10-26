import { TrendingUp, Users, ShoppingCart, DollarSign } from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
  // Mock data - in real app, this would come from Shopify API
  const stats = [
    {
      title: 'Total Visitors',
      value: '12,345',
      change: '+12.5%',
      icon: Users,
      color: '#667eea'
    },
    {
      title: 'Conversion Rate',
      value: '3.2%',
      change: '+0.5%',
      icon: TrendingUp,
      color: '#48bb78'
    },
    {
      title: 'Orders',
      value: '432',
      change: '+8.3%',
      icon: ShoppingCart,
      color: '#ed8936'
    },
    {
      title: 'Revenue',
      value: '$8,934',
      change: '+15.2%',
      icon: DollarSign,
      color: '#38b2ac'
    }
  ];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p>Welcome back! Here's what's happening with your store today.</p>
      </div>

      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: `${stat.color}15` }}>
              <stat.icon size={24} color={stat.color} />
            </div>
            <div className="stat-content">
              <p className="stat-title">{stat.title}</p>
              <h3 className="stat-value">{stat.value}</h3>
              <span className="stat-change positive">{stat.change} from last week</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-sections">
        <div className="section">
          <h2>Quick Actions</h2>
          <div className="action-cards">
            <div className="action-card">
              <h3>Generate Social Post</h3>
              <p>Create engaging content for your products</p>
              <button className="btn-primary">Create Post</button>
            </div>
            <div className="action-card">
              <h3>View Analytics</h3>
              <p>Deep dive into your store performance</p>
              <button className="btn-primary">View Details</button>
            </div>
            <div className="action-card">
              <h3>Connect Shopify</h3>
              <p>Sync your store data for insights</p>
              <button className="btn-primary">Connect Now</button>
            </div>
          </div>
        </div>

        <div className="section">
          <h2>Recent Activity</h2>
          <div className="activity-list">
            <div className="activity-item">
              <div className="activity-dot"></div>
              <div className="activity-content">
                <p className="activity-title">New order received</p>
                <p className="activity-time">2 minutes ago</p>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-dot"></div>
              <div className="activity-content">
                <p className="activity-title">Social post published</p>
                <p className="activity-time">1 hour ago</p>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-dot"></div>
              <div className="activity-content">
                <p className="activity-title">Traffic spike detected</p>
                <p className="activity-time">3 hours ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
