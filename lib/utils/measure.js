module.exports = async (label, callback) => {
  const now = Date.now();
  await callback();
  console.log(`       ⮑  ⏱  ${label}: ${Date.now() - now}ms`);
};
