import assert from 'node:assert/strict';
import { parseMathExpression } from './mathExpression';

assert.equal(parseMathExpression('10 + 2 * 3'), 16);
assert.equal(parseMathExpression('10 / 4'), 2.5);
assert.equal(parseMathExpression('12,50 + 7,50'), 20);
assert.equal(parseMathExpression('-5 + 10'), 5);
assert.equal(parseMathExpression('10 * -2 + 25'), 5);

assert.equal(parseMathExpression(''), null);
assert.equal(parseMathExpression('2 / 0'), null);
assert.equal(parseMathExpression('1..2 + 3'), null);
assert.equal(parseMathExpression('10 +'), null);
assert.equal(parseMathExpression('2 ** 3'), null);
assert.equal(parseMathExpression('alert(1)'), null);
assert.equal(parseMathExpression('-10 + 2'), null);

console.log('mathExpression tests passed');
