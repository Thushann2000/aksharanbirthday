const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
// Base64 படங்கள் பெரியதாக இருப்பதால் limit-ஐ 10mb ஆக வைப்பது நல்லது
app.use(express.json({ limit: '10mb' })); 
app.use(express.static('public'));

// MongoDB Connection
const dbURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/birthdaySignatures';

mongoose.connect(dbURI)
  .then(() => console.log('MongoDB connected successfully to Atlas'))
  .catch(err => console.error('MongoDB connection error:', err));

// Signature Schema
const signatureSchema = new mongoose.Schema({
  // உங்கள் index.html-இல் 'signature' என்று அனுப்புவதால் இங்கும் அப்படியே மாற்றிவிட்டேன்
  signature: { type: String, required: true }, 
  name: { type: String, default: 'Anonymous' },
  wish: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

// வேகம் அதிகரிக்க: createdAt-க்கு indexing கொடுக்கிறோம். 
// இது 500+ தரவுகள் இருந்தாலும் மிக வேகமாகத் தேட உதவும்.
signatureSchema.index({ createdAt: -1 });

const Signature = mongoose.model('Signature', signatureSchema);

// Save Signature Endpoint
app.post('/api/signatures', async (req, res) => {
  try {
    const { signature, name, wish } = req.body;

    if (!signature) {
      return res.status(400).json({ success: false, message: 'Signature is required' });
    }

    const newSignature = new Signature({
      signature,
      name: name || 'Anonymous',
      wish: wish || ''
    });

    await newSignature.save();
    res.json({ success: true, message: 'Signature saved successfully!' });
  } catch (error) {
    console.error('Error saving signature:', error);
    res.status(500).json({ success: false, message: 'Server error while saving' });
  }
});

// Gallery-க்காக சிக்னேச்சர்களைப் பெறுதல் (With Pagination)
// இதுதான் இணையதளத்தை வேகமாக வைத்திருக்கும் முக்கிய பகுதி
app.get('/api/signatures', async (req, res) => {
  try {
    // குவெரியில் வரும் page மற்றும் limit-ஐ எடுக்கிறோம் (எ.கா: /api/signatures?page=1&limit=12)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const signatures = await Signature.find()
      .sort({ createdAt: -1 }) // புதியவை முதலில் வர
      .skip(skip)
      .limit(limit);

    res.json(signatures);
  } catch (err) {
    console.error('Error fetching signatures:', err);
    res.status(500).json({ success: false });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});