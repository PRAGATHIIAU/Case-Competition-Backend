const helloService = require('../services/helloService');

const getHello = async (req, res) => {
  console.log('-> triggered endpoint GET /');
  try {
    const message = helloService.getHelloMessage();
    res.json({ message });
    console.log('-> finished endpoint execution GET /');
  } catch (error) {
    console.log('-> finished endpoint execution GET /');
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getHello
};


