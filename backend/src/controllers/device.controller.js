const { Device } = require('../models');
const wahaService = require('../services/waha.service');
const { Op } = require('sequelize');

// Create Device (Start Session)
exports.create = async (req, res) => {
  try {
    const userId = req.user.id;
    const { alias } = req.body;

    // 1. Check Limits (Optional: enforce 1 device per user for valid SaaS logic, though WAHA Core handles total limit)
    // For now, let's allow trying.
    
    // 2. Create DB Record (Initial status: STARTING)
    const device = await Device.create({
      userId,
      sessionName: 'temp', // Will update with ID
      status: 'STARTING',
      metadata: { alias: alias || 'New Device' }
    });

    // Update sessionName to match ID for consistency
    device.sessionName = device.id;
    await device.save();

    // 3. Call WAHA to start session
    try {
      await wahaService.createSession(device.sessionName);
      
      // Update status to SCAN_QR as WAHA usually goes to QR stage immediately for new sessions
      device.status = 'SCAN_QR';
      await device.save();

      res.status(201).json(device);
    } catch (wahaError) {
      console.error('WAHA Start Session Error:', wahaError);
      // Rollback DB record if WAHA fails (e.g. limit reached)
      await device.destroy();
      return res.status(500).json({ error: 'Failed to start WAHA session. Limit might be reached.' });
    }

  } catch (error) {
    console.error('Create Device Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// List Devices
exports.list = async (req, res) => {
  try {
    const devices = await Device.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });

    // Lazy sync with WAHA
    let wahaSessions = [];
    try {
      wahaSessions = await wahaService.getSessions();
    } catch (wahaError) {
      console.error('[DeviceController] WAHA getSessions failed:', wahaError.message);
      // Continue with DB data if WAHA is unreachable
      return res.json(devices);
    }

    const updatedDevices = [];
    for (const device of devices) {
      const session = wahaSessions.find(s => s.name === device.sessionName);
      let newStatus = device.status;

      if (!session) {
        // If NOT_FOUND in WAHA but exists in DB, it's disconnected/invalid
        newStatus = 'DISCONNECTED';
      } else {
        // Map WAHA status to our DB status
        // WAHA statuses: STARTING, SCAN_QR, WORKING, FAILED, STOPPED
        if (session.status === 'WORKING') {
          newStatus = 'CONNECTED';
        } else if (session.status === 'SCAN_QR') {
          newStatus = 'SCAN_QR';
        } else if (['STOPPED', 'FAILED', 'STOPPING'].includes(session.status)) {
          newStatus = 'DISCONNECTED';
        } else if (session.status === 'STARTING') {
          newStatus = 'STARTING';
        }
      }

      if (newStatus !== device.status) {
        device.status = newStatus;
        await device.save();
      }
      updatedDevices.push(device);
    }

    res.json(updatedDevices);
  } catch (error) {
    console.error('List Devices Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get QR Code
exports.getQR = async (req, res) => {
  try {
    const { id } = req.params;
    
    const device = await Device.findOne({ 
      where: { id, userId: req.user.id } 
    });

    if (!device) return res.status(404).json({ error: 'Device not found' });

    // 1. Check session status in WAHA
    let session = await wahaService.getSession(device.sessionName);
    console.log(`[DeviceController] Current WAHA session status for ${device.sessionName}: ${session?.status || 'NOT_FOUND'}`);
    
    // 2. Ensure session exists and is STARTED
    if (!session) { 
      console.log(`[DeviceController] Session ${device.sessionName} missing. Creating...`);
      await wahaService.createSession(device.sessionName);
      console.log(`[DeviceController] Session created. Starting...`);
      await wahaService.startExistingSession(device.sessionName);
      await wahaService.setWebhooks(device.sessionName); // Ensure webhooks are set
      await new Promise(resolve => setTimeout(resolve, 3000));
    } else if (session.status === 'STOPPED' || session.status === 'STOPPING' || session.status === 'FAILED') {
      console.log(`[DeviceController] Session ${device.sessionName} is ${session.status}. Re-provisioning...`);
      try {
        // Stop & Delete to ensure clean slate with new Webhook Config
        await wahaService.stopSession(device.sessionName);
        await wahaService.deleteSession(device.sessionName);
        
        // Re-create session
        await wahaService.createSession(device.sessionName);
        console.log(`[DeviceController] Session re-created. Starting...`);
        
        // Start the session
        await wahaService.startExistingSession(device.sessionName);
        console.log(`[DeviceController] Session started. Waiting for initialization...`);
        
        // Wait a bit for initialization 
        await new Promise(resolve => setTimeout(resolve, 4000));
      } catch (startError) {
        console.error('[DeviceController] Failed to re-provision session:', startError.message);
      }
    } else if (session.status === 'STARTING') {
      console.log(`[DeviceController] Session ${device.sessionName} is already STARTING. Waiting...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // 3. Get QR Code
    console.log(`[DeviceController] Requesting QR Code for ${device.sessionName}...`);
    const qrDataUrl = await wahaService.getQRCode(device.sessionName);
    
    if (!qrDataUrl) {
      // One last check - maybe it's already connected?
      const finalSession = await wahaService.getSession(device.sessionName);
      if (finalSession?.status === 'WORKING') {
        return res.json({ message: 'Device is already connected and working.', status: 'CONNECTED' });
      }

      console.log(`[DeviceController] QR fetch failed. Final status: ${finalSession?.status}`);
      return res.status(404).json({ 
        error: 'QR Code not available',
        message: 'The session started but the QR code is not ready yet. Please try again in a few seconds.',
        sessionStatus: finalSession?.status
      });
    }

    res.json({ qrCode: qrDataUrl });

  } catch (error) {
    console.error('Get QR Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Restart Session (for expired QR)
exports.restart = async (req, res) => {
  try {
    const { id } = req.params;
    
    const device = await Device.findOne({ 
      where: { id, userId: req.user.id } 
    });

    if (!device) return res.status(404).json({ error: 'Device not found' });

    console.log(`[DeviceController] Restarting session ${device.sessionName}...`);
    
    // Stop & Delete WAHA session
    await wahaService.stopSession(device.sessionName);
    await wahaService.deleteSession(device.sessionName);
    
    // Create fresh
    await wahaService.createSession(device.sessionName);
    await wahaService.startExistingSession(device.sessionName);
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Update device status
    device.status = 'SCAN_QR';
    await device.save();

    res.json({ message: 'Session restarted successfully', device });

  } catch (error) {
    console.error('Restart Session Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete Device (Stop Session)
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    
    const device = await Device.findOne({ 
      where: { id, userId: req.user.id } 
    });

    if (!device) return res.status(404).json({ error: 'Device not found' });

    // Stop & Delete in WAHA
    await wahaService.stopSession(device.sessionName);
    await wahaService.deleteSession(device.sessionName);

    // Delete from DB
    await device.destroy();

    res.json({ message: 'Device deleted successfully' });

  } catch (error) {
    console.error('Delete Device Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
