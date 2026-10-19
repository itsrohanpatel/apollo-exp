const STANDARD_MACRO_INTERVALS = [
  { min: 1, max: 10, label: '1,10' },
  { min: 11, max: 20, label: '11,20' },
  { min: 21, max: 50, label: '21,50' },
  { min: 51, max: 100, label: '51,100' },
  { min: 101, max: 200, label: '101,200' },
  { min: 201, max: 500, label: '201,500' },
  { min: 501, max: 1000, label: '501,1000' },
  { min: 1001, max: 5000, label: '1001,5000' },
  { min: 5001, max: 10000, label: '5001,10000' },
  { min: 10001, max: Infinity, label: '10001' }
];

function isHighDensityBracket(bracket) {
  if (!bracket || !bracket[0]) return false;
  const str = bracket[0];
  if (['1,10', '11,20', '21,50', '51,100', '101,200', '201,500'].includes(str)) return true;
  const parts = str.split(',').map(Number);
  if (parts.length === 2) {
    const diff = parts[1] - parts[0];
    return diff > 50 && parts[0] <= 500;
  }
  return false;
}

function decomposeHighDensityBracket(macroBracketStr) {
  if (macroBracketStr === '101,200') return [['101,150'], ['151,200']];
  if (macroBracketStr === '201,500') {
    return [['201,250'], ['251,300'], ['301,350'], ['351,400'], ['401,500']];
  }
  if (macroBracketStr === '51,100') {
    return [['51,60'], ['61,70'], ['71,80'], ['81,90'], ['91,100']];
  }
  return [[macroBracketStr]];
}

function expandOpenHeadcountRange(openRangeStr = '1,') {
  const trimmed = openRangeStr.trim();
  if (trimmed.endsWith(',')) {
    const lower = parseInt(trimmed.replace(',', ''), 10) || 1;
    const brackets = [];
    for (const interval of STANDARD_MACRO_INTERVALS) {
      if (interval.max < lower) continue;
      if (interval.max === Infinity) {
        brackets.push(['10001']);
      } else if (lower >= interval.min && lower <= interval.max) {
        brackets.push([`${lower},${interval.max}`]);
      } else if (interval.min > lower) {
        brackets.push([`${interval.min},${interval.max}`]);
      }
    }
    return brackets.length > 0 ? brackets : [['10001']];
  }
  return [[trimmed]];
}

function resolveExecutionBrackets(basePayload) {
  const customRanges = basePayload?.organization_num_employees_ranges;
  if (Array.isArray(customRanges) && customRanges.length > 0) {
    if (customRanges.length === 1 && typeof customRanges[0] === 'string' && (customRanges[0].endsWith(',') || customRanges[0].startsWith(','))) {
      const macroBrackets = expandOpenHeadcountRange(customRanges[0]);
      const micro = [];
      for (const macroItem of macroBrackets) {
        const macro = macroItem[0];
        if (macro === '10001') {
          micro.push(['10001']);
        } else if (macro === '1001,5000') {
          micro.push(['1001,2000'], ['2001,5000']);
        } else if (macro === '501,1000') {
          micro.push(['501,750'], ['751,1000']);
        } else if (macro === '5001,10000') {
          micro.push(['5001,7500'], ['7501,10000']);
        } else if (isHighDensityBracket([macro])) {
          micro.push(...decomposeHighDensityBracket(macro));
        } else {
          micro.push([macro]);
        }
      }
      return micro;
    }
  }
}

const brackets = resolveExecutionBrackets({ organization_num_employees_ranges: ['50,'] });
console.log('Resolved brackets for 50, :');
console.log(brackets);
