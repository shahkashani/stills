const { sortBy } = require('lodash');
const { hrtime } = require('node:process');
const { freemem } = require('os');
const usage = require('cpu-percentage');

let level = 0;
const stack = [];
let start;

module.exports = async (label, callback, isShowExtraMetrics = true) => {
  if (!start) {
    start = usage();
  }
  level += 1;
  const now = Date.now();
  const id = hrtime.bigint();

  let result;
  try {
    result = await callback();
  } catch (err) {
    level -= 1;
    throw err;
  }
  const ellapsed = Date.now() - now;
  const cpuPercent = usage(start).percent;
  const freeMemory = freemem() / (1024 * 1024);

  stack.push({
    id,
    label,
    ellapsed,
    level,
    cpuPercent,
    freeMemory,
    isShowExtraMetrics
  });

  level -= 1;

  if (level === 0) {
    sortBy(stack, 'id').forEach(
      ({ label, ellapsed, level, cpuPercent, isShowExtraMetrics }) => {
        const space = ' '.repeat(4 * level);
        const cpuPart = isShowExtraMetrics
          ? ` (${Math.round(cpuPercent)}% cpu, ${Math.round(
              freeMemory
            )}mb free memory)`
          : '';
        console.log(`${space}⮑  ⏱  ${label}: ${ellapsed}ms${cpuPart}`);
      }
    );
    stack.length = 0;
  }

  return result;
};
