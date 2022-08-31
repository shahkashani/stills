const { sortBy } = require('lodash');
const { hrtime } = require('node:process');

let level = 0;
const stack = [];

module.exports = async (label, callback) => {
  level += 1;

  const now = Date.now();
  const id = hrtime.bigint();
  let result;
  try {
    result = await callback();
  } catch (err) {
    level -= 1;
    throw new Error(err);
  }
  const ellapsed = Date.now() - now;

  stack.push({
    id,
    label,
    ellapsed,
    level
  });

  level -= 1;

  if (level === 0) {
    sortBy(stack, 'id').forEach(({ label, ellapsed, level }) => {
      const space = ' '.repeat(4 * level);
      console.log(`${space}⮑  ⏱  ${label}: ${ellapsed}ms`);
    });
    stack.length = 0;
  }

  return result;
};
