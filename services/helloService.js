const helloRepository = require('../repositories/helloRepository');

const getHelloMessage = () => {
  return helloRepository.getHelloMessage();
};

module.exports = {
  getHelloMessage
};

