import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './StaffPages.css';

const DashboardPage = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [checkoutTask, setCheckoutTask] = useState(null);
  const [workSummary, setWorkSummary] = useState('');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await axios.get('/api/tasks/my-tasks');
      const allTasks = Array.isArray(response.data.tasks)
        ? response.data.tasks
        : [];

      const upcomingTasks = allTasks.filter(
        (t) =>
          ['pending', 'assigned', 'in-progress'].includes(t.status)
      );

      setTasks(upcomingTasks.slice(0, 3));
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const haversine = (lat1, lon1, lat2, lon2) => {
    const toRad = (x) => (x * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getCurrentCoords = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation)
        return reject(new Error('Geolocation not supported'));
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }),
        (err) => reject(new Error(err.message || 'Geolocation failed')),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });

  const handleClockIn = async (task) => {
    const taskId = task.id || task._id;
    try {
      setProcessing(taskId);
      const coords = await getCurrentCoords();

      if (task.coordinates?.latitude && task.coordinates?.longitude) {
        const dist = haversine(
          Number(coords.latitude),
          Number(coords.longitude),
          Number(task.coordinates.latitude),
          Number(task.coordinates.longitude)
        );

        if (dist > 500) {
          alert(
            `You are too far from the assigned location (${Math.round(
              dist
            )}m). Move within 500m to check in.`
          );
          setProcessing(null);
          return;
        }
      }

      // Pass coordinates to backend for double validation
      await axios.post(`/api/tasks/${taskId}/clock-in`, coords);
      alert('Clocked in successfully!');
      fetchTasks();
    } catch (error) {
      console.error('Clock in error:', error);
      alert(error.response?.data?.message || 'Failed to clock in');
    } finally {
      setProcessing(null);
    }
  };

  const handleClockOut = (taskId) => {
    setCheckoutTask(taskId);
    setWorkSummary('');
  };

  const submitClockOut = async () => {
    if (!checkoutTask) return;
    try {
      setProcessing(checkoutTask);
      const coords = await getCurrentCoords();
      await axios.post(`/api/tasks/${checkoutTask}/clock-out`, {
        ...coords,
        workSummary,
      });
      alert('Clocked out successfully!');
      setCheckoutTask(null);
      fetchTasks();
    } catch (error) {
      console.error('Clock out error:', error);
      alert(error.response?.data?.message || 'Failed to clock out');
    } finally {
      setProcessing(null);
    }
  };

  if (loading)
    return (
      <div className="staff-page">
        <h1 className="staff-page-title">Dashboard</h1>
        <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div>
      </div>
    );

  return (
    <div className="staff-page">
      <h1 className="staff-page-title">Dashboard</h1>
      <div className="staff-content-card">
        <h3>Today's Assignment</h3>

        {tasks.length === 0 ? (
          <p style={{ textAlign: 'center', padding: 40 }}>No tasks today.</p>
        ) : (
          tasks.map((task) => (
            <div key={task._id} className="staff-assignment">
              <div className="staff-assignment-header">
                <span>{task.client?.name || task.title}</span>
                <span className="staff-status-badge">
                  {task.status || 'Pending'}
                </span>
              </div>

              <div className="staff-assignment-details">
                {task.location && (
                  <div className="staff-detail-item">
                    <span>📍 {task.location}</span>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${
                        task.coordinates?.latitude && task.coordinates?.longitude
                          ? `${task.coordinates.latitude},${task.coordinates.longitude}`
                          : encodeURIComponent(task.location)
                      }`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="staff-directions-btn"
                    >
                      Directions
                    </a>
                  </div>
                )}
              </div>

              <div className="staff-action-buttons">
                {!task.clockInTime ? (
                  <button
                    className="staff-action-btn"
                    onClick={() => handleClockIn(task)}
                    disabled={processing === (task.id || task._id)}
                  >
                    {processing === (task.id || task._id)
                      ? 'Checking in...'
                      : 'Check In'}
                  </button>
                ) : task.clockInTime && !task.clockOutTime ? (
                  <button
                    className="staff-action-btn"
                    onClick={() => handleClockOut(task.id || task._id)}
                    disabled={processing === (task.id || task._id)}
                  >
                    {processing === (task.id || task._id)
                      ? 'Checking out...'
                      : 'Report & Check Out'}
                  </button>
                ) : (
                  <div className="staff-completed-badge">✓ Completed</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {checkoutTask && (
        <div className="modal-overlay" onClick={() => setCheckoutTask(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Report & Check Out</h3>
            <textarea
              rows={6}
              value={workSummary}
              onChange={(e) => setWorkSummary(e.target.value)}
              placeholder="Describe your work..."
            />
            <div>
              <button onClick={() => setCheckoutTask(null)}>Cancel</button>
              <button onClick={submitClockOut}>Submit & Check Out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
