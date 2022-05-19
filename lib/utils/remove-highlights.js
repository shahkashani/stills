const TOKEN = '*';
const regexp = new RegExp(`\\${TOKEN}`, 'g');

module.exports = (text) => (text || '').replace(regexp, '');
