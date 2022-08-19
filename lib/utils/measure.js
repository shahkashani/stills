module.exports = async (label, callback) => {
  const now = Date.now();
  const result = await callback();
  console.log(`       ⮑  ⏱  ${label}: ${Date.now() - now}ms`);
  return result;
};
