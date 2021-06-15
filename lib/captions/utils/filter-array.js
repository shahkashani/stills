module.exports = (paramChecks, queries) => {
  const checks = Array.isArray(paramChecks) ? paramChecks : [paramChecks];
  return checks.filter((check) => {
    if (!check) {
      return false;
    }
    for (const query of queries) {
      if (query instanceof RegExp) {
        if (check.match(query)) {
          return true;
        }
      } else if (check.trim() === query.trim()) {
        return true;
      }
    }
    return false;
  });
};
