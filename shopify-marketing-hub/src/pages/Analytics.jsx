import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import './Analytics.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Analytics = () => {
  // Mock data for charts
  const visitorData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Visitors',
        data: [320, 450, 380, 520, 480, 610, 590],
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  };

  const salesData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Sales',
        data: [1200, 1900, 1400, 2100, 1800, 2400, 2200],
        backgroundColor: 'rgba(72, 187, 120, 0.8)',
        borderColor: '#48bb78',
        borderWidth: 1
      }
    ]
  };

  const trafficSources = [
    { source: 'Organic Search', visitors: 4532, percentage: 45 },
    { source: 'Social Media', visitors: 2876, percentage: 28 },
    { source: 'Direct', visitors: 1523, percentage: 15 },
    { source: 'Referral', visitors: 1215, percentage: 12 }
  ];

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  return (
    <div className="analytics">
      <div className="analytics-header">
        <h1>Analytics</h1>
        <div className="date-selector">
          <button className="date-btn active">7 Days</button>
          <button className="date-btn">30 Days</button>
          <button className="date-btn">90 Days</button>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>Website Traffic</h3>
          <div className="chart-container">
            <Line data={visitorData} options={chartOptions} />
          </div>
        </div>

        <div className="chart-card">
          <h3>Sales Performance</h3>
          <div className="chart-container">
            <Bar data={salesData} options={chartOptions} />
          </div>
        </div>
      </div>

      <div className="traffic-sources-section">
        <h2>Traffic Sources</h2>
        <div className="sources-list">
          {trafficSources.map((item, index) => (
            <div key={index} className="source-item">
              <div className="source-info">
                <span className="source-name">{item.source}</span>
                <span className="source-visitors">{item.visitors.toLocaleString()} visitors</span>
              </div>
              <div className="source-bar-container">
                <div
                  className="source-bar"
                  style={{ width: `${item.percentage}%` }}
                ></div>
              </div>
              <span className="source-percentage">{item.percentage}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="insights-section">
        <h2>Key Insights</h2>
        <div className="insights-grid">
          <div className="insight-card">
            <h4>Best Performing Day</h4>
            <p className="insight-value">Saturday</p>
            <p className="insight-description">610 visitors, 28% conversion rate</p>
          </div>
          <div className="insight-card">
            <h4>Peak Traffic Time</h4>
            <p className="insight-value">2-4 PM</p>
            <p className="insight-description">Optimal posting time for social media</p>
          </div>
          <div className="insight-card">
            <h4>Top Product Category</h4>
            <p className="insight-value">Electronics</p>
            <p className="insight-description">42% of total revenue</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
