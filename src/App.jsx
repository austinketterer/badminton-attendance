import { useState, useEffect } from 'react';
import './index.css';
import { fetchRoster, checkInPlayer, addPlayerToRoster, GOOGLE_SCRIPT_URL } from './googleSheets';

function App() {
  const [roster, setRoster] = useState([]);
  const [checkedInIds, setCheckedInIds] = useState(new Set());
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initial load real data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      if (GOOGLE_SCRIPT_URL === "YOUR_GOOGLE_SCRIPT_URL_HERE") {
        setError("Waiting for Google Script URL connection...");
        setLoading(false);
        return;
      }
      const data = await fetchRoster();
      setRoster(data || []);
      setLoading(false);
    };
    loadData();
  }, []);

  const totalRevenue = checkedInIds.size * 2.50;

  const handleCheckIn = async (player) => {
    const isCurrentlyCheckedIn = checkedInIds.has(player.id);

    // Optimistic UI update
    setCheckedInIds(prev => {
      const newSet = new Set(prev);
      if (isCurrentlyCheckedIn) {
        newSet.delete(player.id);
      } else {
        newSet.add(player.id);
      }
      return newSet;
    });

    if (!isCurrentlyCheckedIn) {
      // Send actual check-in request to Google Sheets in the background
      const success = await checkInPlayer(player.firstName, player.lastName);
      if (!success) {
        // Revert optimistic update if failed
        setCheckedInIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(player.id);
          return newSet;
        });
        alert("Failed to check in " + player.firstName);
      }
    }
  };

  const handleAddPlayer = async (e) => {
    e.preventDefault();
    if (!newFirstName.trim() && !newLastName.trim()) return;

    // Optimistic UI Update
    const newId = `temp-${Date.now()}`;
    const newPlayer = { id: newId, firstName: newFirstName, lastName: newLastName };

    setRoster(prev => [...prev, newPlayer]);
    setCheckedInIds(prev => new Set(prev).add(newId));

    const fn = newFirstName;
    const ln = newLastName;

    setNewFirstName('');
    setNewLastName('');

    // API Call
    const success = await addPlayerToRoster(fn, ln);
    if (success) {
      await checkInPlayer(fn, ln); // Log their attendance for today too
    } else {
      alert("Failed to add player to Google Sheet");
    }
  };

  return (
    <div className="app-container anim-fade-in">
      <header className="header" style={{ marginBottom: '32px', textAlign: 'center' }}>
        <h1 style={{
          background: 'linear-gradient(135deg, var(--accent-primary), #60a5fa)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '8px'
        }}>
          Badminton Club
        </h1>
        <p>Daily Attendance & Revenue Tracker</p>
      </header>

      {error && (
        <div className="glass-panel" style={{ padding: '16px', marginBottom: '24px', backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--accent-warning)', color: 'var(--accent-warning)', textAlign: 'center' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          Loading Roster from Google Sheets...
        </div>
      ) : (
        <>
          {/* Summary Board */}
          <div className="glass-panel" style={{ padding: '24px', marginBottom: '32px', textAlign: 'center', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Today's Revenue</p>
              <div style={{ fontSize: '2.5rem', fontWeight: '700', color: 'var(--accent-success)' }}>
                ${totalRevenue.toFixed(2)}
              </div>
            </div>
            <div style={{ width: '1px', height: '40px', background: 'var(--bg-tertiary)' }}></div>
            <div>
              <p style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Checked In</p>
              <div style={{ fontSize: '2rem', fontWeight: '600' }}>
                {checkedInIds.size} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>/ {roster.length}</span>
              </div>
            </div>
          </div>

          {/* Add New Player Form */}
          <div className="glass-panel" style={{ padding: '20px', marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Add New Player</h2>
            <form onSubmit={handleAddPlayer} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="First Name"
                value={newFirstName}
                onChange={(e) => setNewFirstName(e.target.value)}
              />
              <input
                type="text"
                placeholder="Last Name"
                value={newLastName}
                onChange={(e) => setNewLastName(e.target.value)}
              />
              <button type="submit" className="btn-primary" style={{ shrink: 0, padding: '12px 24px' }}>
                Add +
              </button>
            </form>
          </div>

          {/* Roster List */}
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Club Roster</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>Tap to check in</span>
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {roster.map((player, index) => {
                const isCheckedIn = checkedInIds.has(player.id);
                return (
                  <div
                    key={player.id}
                    onClick={() => handleCheckIn(player)}
                    className={`glass-panel anim-slide-up stagger-${(index % 3) + 1}`}
                    style={{
                      padding: '16px 20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      border: isCheckedIn ? '1px solid var(--accent-success)' : '1px solid var(--glass-border)',
                      background: isCheckedIn ? 'rgba(16, 185, 129, 0.05)' : 'var(--glass-bg)',
                      transition: 'all 0.2s ease',
                      transform: 'translateY(0)' // For hover effect
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <div style={{ fontWeight: '500', fontSize: '1.1rem' }}>
                      {player.firstName} <span style={{ color: 'var(--text-secondary)' }}>{player.lastName}</span>
                    </div>

                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isCheckedIn ? 'var(--accent-success)' : 'var(--bg-tertiary)',
                      color: isCheckedIn ? '#fff' : 'transparent',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}>
                      {/* SVG Checkmark */}
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: isCheckedIn ? 1 : 0, transform: `scale(${isCheckedIn ? 1 : 0.5})`, transition: 'all 0.2s' }}>
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                  </div>
                );
              })}

              {roster.length === 0 && !error && (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No players found. Add someone above!
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
