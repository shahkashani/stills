const TOKEN = '*';
const regexp = new RegExp(`\\${TOKEN}`, 'g');

console.log(regexp);

module.exports = (text) => (text || '').replace(regexp, '');
