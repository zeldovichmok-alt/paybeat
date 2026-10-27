'use strict';

function compareVersions(left, right) {
  const parse = value => String(value || '').replace(/^v/i, '').split(/[+-]/, 1)[0].split('.').map(part => Number.parseInt(part, 10) || 0);
  const a = parse(left), b = parse(right);
  for (let index = 0; index < 3; index++) if ((a[index] || 0) !== (b[index] || 0)) return (a[index] || 0) - (b[index] || 0);
  return 0;
}

module.exports = { compareVersions };
