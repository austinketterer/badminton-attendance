import { useState, useEffect } from 'react';
import './index.css';
import { fetchRoster, checkInPlayer, addPlayerToRoster, editPlayerInRoster, GOOGLE_SCRIPT_URL } from './googleSheets';

function App() {
  const [roster, setRoster] = useState([]);

  // Persist check-ins for the day using localStorage
  const [checkedInIds, setCheckedInIds] = useState(() => {
    try {
      const storedDate = localStorage.getItem('badminton_checked_in_date');
      const today = new Date().toDateString();
      if (storedDate === today) {
        const ids = JSON.parse(localStorage.getItem('badminton_checked_in_ids'));
        if (Array.isArray(ids)) return new Set(ids);
      }
    } catch (e) {
      console.warn("Could not load stored check-in data", e);
    }
    return new Set();
  });

  useEffect(() => {
    localStorage.setItem('badminton_checked_in_date', new Date().toDateString());
    localStorage.setItem('badminton_checked_in_ids', JSON.stringify([...checkedInIds]));
  }, [checkedInIds]);

  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
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
      const fn = (player.firstName || "").trim().replace(/\s+/g, ' ');
      const ln = (player.lastName || "").trim().replace(/\s+/g, ' ');

      const success = await checkInPlayer(fn, ln);
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

    // Sanitize input
    const fn = newFirstName.trim().replace(/\s+/g, ' ');
    const ln = newLastName.trim().replace(/\s+/g, ' ');

    // Optimistic UI Update
    const newId = `temp-${Date.now()}`;
    const newPlayer = { id: newId, firstName: fn, lastName: ln };

    setRoster(prev => [...prev, newPlayer]);
    setCheckedInIds(prev => new Set(prev).add(newId));

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

  const handleEditPlayer = async (e, player) => {
    e.stopPropagation();
    const newFn = prompt("Update First Name:", player.firstName || "");
    if (newFn === null) return;
    const newLn = prompt("Update Last Name:", player.lastName || "");
    if (newLn === null) return;

    const fn = newFn.trim().replace(/\s+/g, ' ');
    const ln = newLn.trim().replace(/\s+/g, ' ');

    if (!fn && !ln) return;

    // Optimistic UI Update
    setRoster(prev => prev.map(p => p.id === player.id ? { ...p, firstName: fn, lastName: ln } : p));

    const success = await editPlayerInRoster(player.firstName, player.lastName, fn, ln);
    if (!success) {
      alert("Failed to update player name in Google Sheet");
      // Revert optimistic
      setRoster(prev => prev.map(p => p.id === player.id ? { ...p, firstName: player.firstName, lastName: player.lastName } : p));
    }
  };

  return (
    <div className="app-container anim-fade-in">
      <header className="header" style={{ marginBottom: '24px', textAlign: 'center' }}>
        <h1 style={{
          fontSize: '1.5rem',
          color: 'var(--text-primary)',
          fontWeight: 'bold'
        }}>
          Badminton Attendence: {checkedInIds.size} Checked In Today.
        </h1>
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
          {/* Search Bar */}
          <div style={{ marginBottom: '24px' }}>
            <input
              type="text"
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 16px',
                borderRadius: '12px',
                border: '1px solid var(--glass-border)',
                background: 'var(--glass-bg)',
                color: 'var(--text-primary)',
                fontSize: '1rem',
                outline: 'none'
              }}
            />
          </div>

          {/* Roster List */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {roster
                .filter(p => `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()))
                .sort((a, b) => {
                  const aIn = checkedInIds.has(a.id) ? 1 : 0;
                  const bIn = checkedInIds.has(b.id) ? 1 : 0;
                  if (aIn !== bIn) return bIn - aIn;
                  return (a.firstName || '').localeCompare(b.firstName || '');
                })
                .map((player, index) => {
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

                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button
                          onClick={(e) => handleEditPlayer(e, player)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'color 0.2s'
                          }}
                          title="Edit Player"
                          onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                          onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
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
                    </div>
                  );
                })}

              {roster.length === 0 && !error && !loading && !searchQuery && (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No players found. Add someone below!
                </div>
              )}
              {roster.length > 0 && roster.filter(p => `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No players matched your search.
                </div>
              )}
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
        </>
      )}
    </div>
  );
}

export default App;
