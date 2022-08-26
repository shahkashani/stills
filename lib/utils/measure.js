const { sortBy } = require('lodash');

const { hrtime } = require('node:process');

let level = 0;
const stack = [];

module.exports = async (label, callback) => {
  level += 1;

  const now = Date.now();
  const id = hrtime.bigint();
  const result = await callback();
  const ellapsed = Date.now() - now;

  stack.push({
    id,
    label,
    ellapsed,
    level
  });

  level -= 1;

  if (level === 0) {
    sortBy(stack, 'id').forEach(({ label, ellapsed, level, id }) => {
      const space = ' '.repeat(6 * level);
      console.log(`${space}⮑  ⏱  ${label}: ${ellapsed}ms`);
    });
    stack.length = 0;
  }

  return result;
};
