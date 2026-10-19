import fs from 'fs';

const content = fs.readFileSync('extension/injected.js', 'utf8');

const fnCode = content.slice(
  content.indexOf('function isHighDensityBracket'),
  content.indexOf('// 3. Autonomous Universal Deep Harvester')
);

// Define in local scope
const sandbox = new Function(fnCode + `
  return {
    isHighDensity: isHighDensityBracket(['1001,5000']),
    res1001_5000: resolveExecutionBrackets({ organization_num_employees_ranges: ['1001,5000'] }),
    res50_plus: resolveExecutionBrackets({ organization_num_employees_ranges: ['50,'] })
  };
`);

const results = sandbox();
console.log('isHighDensityBracket([1001,5000]):', results.isHighDensity);
console.log('resolveExecutionBrackets([1001,5000]):', results.res1001_5000);
console.log('Total brackets for 50, :', results.res50_plus.length);
console.log('Includes 1001,5000 as a single bracket in 50, ?', results.res50_plus.some(b => b[0] === '1001,5000'));
