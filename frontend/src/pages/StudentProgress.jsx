import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler, BarElement } from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import Layout from '../components/Layout';
import API_BASE from '../config';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler, BarElement);

const StudentProgress = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/student/progress`, {
          headers: { 'x-auth-token': token }
        });
        const d = await res.json();
        if (d.error) setError(d.error);
        else setData(d);
      } catch (err) { setError('Failed to load progress data.'); }
      finally { setLoading(false); }
    };
    fetchProgress();
  }, [token]);

  if (loading) return (
    <Layout type="student">
      <div className="animate-fade-in" style={{ maxWidth: 900, margin: '0 auto' }}>
        <div className="skeleton" style={{ height: 60, borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem' }}></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-lg)' }}></div>)}
        </div>
        <div className="skeleton" style={{ height: 300, borderRadius: 'var(--radius-lg)' }}></div>
      </div>
    </Layout>
  );

  if (error) return (
    <Layout type="student">
      <div className="animate-fade-in" style={{ maxWidth: 900, margin: '0 auto' }}>
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <i className="fas fa-chart-line" style={{ fontSize: '3rem', color: 'var(--text-light)', marginBottom: '1rem' }}></i>
          <h3 style={{ marginBottom: '0.5rem' }}>No Progress Data Yet</h3>
          <p style={{ color: 'var(--text-muted)' }}>{error}</p>
          <p style={{ color: 'var(--text-light)', fontSize: '0.85rem', marginTop: '1rem' }}>Complete tests and assignments to see your progress here!</p>
        </div>
      </div>
    </Layout>
  );

  if (!data) return null;

  const { totalTests, totalSubmitted, averageMarks, marksData, labels } = data;
  const completionRate = totalTests > 0 ? Math.round((totalSubmitted / totalTests) * 100) : 0;
  const avgScore = averageMarks ? parseFloat(averageMarks).toFixed(1) : '0';
  const highest = marksData?.length > 0 ? Math.max(...marksData) : 0;

  const gradeColor = avgScore >= 80 ? '#10b981' : avgScore >= 60 ? '#f59e0b' : avgScore >= 40 ? '#f97316' : '#ef4444';
  const grade = avgScore >= 90 ? 'A+' : avgScore >= 80 ? 'A' : avgScore >= 70 ? 'B+' : avgScore >= 60 ? 'B' : avgScore >= 50 ? 'C' : avgScore >= 40 ? 'D' : 'F';

  // Line chart
  const lineData = {
    labels: labels || [],
    datasets: [{
      label: 'Score',
      data: marksData || [],
      borderColor: '#7c3aed',
      backgroundColor: 'rgba(124, 58, 237, 0.08)',
      borderWidth: 3,
      tension: 0.4,
      fill: true,
      pointBackgroundColor: '#7c3aed',
      pointBorderColor: 'white',
      pointBorderWidth: 2,
      pointRadius: 5,
      pointHoverRadius: 8
    }]
  };

  const lineOpts = {
    responsive: true, maintainAspectRatio: false,
    scales: {
      y: { beginAtZero: true, max: 100, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 11 } } },
      x: { grid: { display: false }, ticks: { font: { size: 11 } } }
    },
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1e1b4b', titleFont: { size: 13 }, bodyFont: { size: 12 }, padding: 10, cornerRadius: 8 } }
  };

  // Bar chart for recent scores
  const barData = {
    labels: (labels || []).slice(-6),
    datasets: [{
      label: 'Score',
      data: (marksData || []).slice(-6),
      backgroundColor: (marksData || []).slice(-6).map(m => m >= 80 ? 'rgba(16,185,129,0.7)' : m >= 60 ? 'rgba(245,158,11,0.7)' : 'rgba(239,68,68,0.7)'),
      borderRadius: 6,
      borderSkipped: false
    }]
  };

  const barOpts = {
    responsive: true, maintainAspectRatio: false,
    scales: {
      y: { beginAtZero: true, max: 100, grid: { color: 'rgba(0,0,0,0.04)' } },
      x: { grid: { display: false } }
    },
    plugins: { legend: { display: false } }
  };

  // Doughnut
  const doughnutData = {
    labels: ['Completed', 'Remaining'],
    datasets: [{
      data: [totalSubmitted, Math.max(totalTests - totalSubmitted, 0)],
      backgroundColor: ['#7c3aed', 'rgba(124,58,237,0.1)'],
      borderWidth: 0, hoverOffset: 8
    }]
  };

  const doughnutOpts = {
    responsive: true, maintainAspectRatio: false, cutout: '75%',
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1e1b4b', cornerRadius: 8 } }
  };

  return (
    <Layout type="student">
      <div className="animate-fade-in" style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
            <i className="fas fa-chart-line text-primary" style={{ marginRight: '0.75rem' }}></i>
            Learning Progress
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Track your scores, completion rate, and performance trends.</p>
        </div>

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
          {[
            { icon: 'fa-clipboard-list', color: '#7c3aed', label: 'Total Tests', value: totalTests },
            { icon: 'fa-check-double', color: '#10b981', label: 'Completed', value: totalSubmitted },
            { icon: 'fa-percentage', color: gradeColor, label: 'Avg Score', value: `${avgScore}%` },
            { icon: 'fa-trophy', color: '#f59e0b', label: 'Highest', value: highest > 0 ? `${highest}%` : '—' }
          ].map((stat, idx) => (
            <div key={idx} className="card" style={{ padding: '1.25rem', textAlign: 'center', borderTop: `3px solid ${stat.color}` }}>
              <i className={`fas ${stat.icon}`} style={{ fontSize: '1.5rem', color: stat.color, marginBottom: '0.5rem' }}></i>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', lineHeight: 1.2 }}>{stat.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '0.25rem' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Grade + Completion Ring Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          {/* Grade Card */}
          <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: gradeColor, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem', fontSize: '2rem', fontWeight: 800, color: 'white', boxShadow: `0 4px 15px ${gradeColor}40` }}>
              {grade}
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Overall Grade</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Based on avg score</div>
          </div>

          {/* Completion Ring */}
          <div className="card" style={{ textAlign: 'center', padding: '1.5rem', position: 'relative' }}>
            <div style={{ height: 110, position: 'relative' }}>
              <Doughnut data={doughnutData} options={doughnutOpts} />
              <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{completionRate}%</div>
              </div>
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '0.5rem', color: 'var(--text-main)' }}>Completion Rate</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{totalSubmitted}/{totalTests} tests</div>
          </div>

          {/* Streak / Status */}
          <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <i className="fas fa-fire" style={{ fontSize: '2.5rem', color: '#f97316', marginBottom: '0.5rem' }}></i>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{totalSubmitted}</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>Tests Attempted</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {completionRate >= 80 ? '🏆 Excellent!' : completionRate >= 50 ? '💪 Keep going!' : '📚 More to complete'}
            </div>
          </div>
        </div>

        {/* Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
          {/* Performance Trend */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
              <i className="fas fa-chart-line" style={{ color: '#7c3aed', marginRight: '0.5rem' }}></i>Performance Trend
            </h3>
            <div style={{ height: 260 }}>
              {marksData?.length > 0 ? <Line data={lineData} options={lineOpts} /> : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-light)' }}>
                  <p>Complete tests to see your trend</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Scores */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
              <i className="fas fa-chart-bar" style={{ color: '#10b981', marginRight: '0.5rem' }}></i>Recent Scores
            </h3>
            <div style={{ height: 260 }}>
              {marksData?.length > 0 ? <Bar data={barData} options={barOpts} /> : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-light)' }}>
                  <p>No scores yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Performance Breakdown */}
        {marksData?.length > 0 && (
          <div className="card" style={{ padding: '1.25rem', marginTop: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
              <i className="fas fa-list-ol" style={{ color: '#f59e0b', marginRight: '0.5rem' }}></i>Test Scores Breakdown
            </h3>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {(labels || []).map((label, idx) => {
                const score = marksData[idx] || 0;
                const clr = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem', minWidth: 120 }}>{label}</span>
                    <div style={{ flex: 1, height: 8, background: 'var(--bg-input)', borderRadius: 999, overflow: 'hidden' }}>
                      <div style={{ width: `${score}%`, height: '100%', background: clr, borderRadius: 999, transition: 'width 0.8s ease' }}></div>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: clr, minWidth: 40, textAlign: 'right' }}>{score}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default StudentProgress;
