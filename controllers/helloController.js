const helloService = require('../services/helloService');

const getHello = async (req, res) => {
  try {
    const message = helloService.getHelloMessage();
    res.json({ message });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getHello
};


