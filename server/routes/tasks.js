// routes/tasks.js
const express = require('express');
const router = express.Router();
const Task = require('../models/Task');

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

router.post('/:id/clock-in', async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (!task.coordinates)
      return res
        .status(400)
        .json({ message: 'Task has no assigned coordinates' });

    const distance = haversine(
      Number(latitude),
      Number(longitude),
      Number(task.coordinates.latitude),
      Number(task.coordinates.longitude)
    );

    if (distance > 500) {
      return res.status(403).json({
        message: `Too far from assigned location (${Math.round(
          distance
        )}m). Move within 500m.`,
      });
    }

    task.clockInTime = new Date();
    await task.save();
    res.json({ message: 'Clocked in successfully', distance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/clock-out', async (req, res) => {
  try {
    const { workSummary } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    task.clockOutTime = new Date();
    task.workSummary = workSummary;
    await task.save();

    res.json({ message: 'Clocked out successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
