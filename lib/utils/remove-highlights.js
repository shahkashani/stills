const TOKEN = '*';
const regexp = new RegExp(`\\${TOKEN}`, 'g');

module.exports = (text) => {
  return (text || '').toString().replace(regexp, '');
};
