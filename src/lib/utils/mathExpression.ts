const MAX_EXPRESSION_LENGTH = 200;

export function parseMathExpression(rawValue: string): number | null {
  const expression = rawValue.replace(/\s+/g, '').replace(/,/g, '.');
  if (!expression || expression.length > MAX_EXPRESSION_LENGTH || !/^[\d.+\-*/]+$/.test(expression)) {
    return null;
  }

  let position = 0;

  function parseNumber(): number | null {
    const start = position;
    let decimalPoints = 0;

    while (position < expression.length && /[\d.]/.test(expression[position])) {
      if (expression[position] === '.') decimalPoints += 1;
      position += 1;
    }

    const token = expression.slice(start, position);
    if (!token || token === '.' || decimalPoints > 1) return null;

    const value = Number(token);
    return Number.isFinite(value) ? value : null;
  }

  function parseSignedNumber(): number | null {
    let sign = 1;

    if (expression[position] === '+' || expression[position] === '-') {
      if (expression[position] === '-') sign = -1;
      position += 1;
    }

    const value = parseNumber();
    return value === null ? null : sign * value;
  }

  function parseProduct(): number | null {
    let value = parseSignedNumber();
    if (value === null) return null;

    while (expression[position] === '*' || expression[position] === '/') {
      const operator = expression[position];
      position += 1;
      const right = parseSignedNumber();
      if (right === null || (operator === '/' && right === 0)) return null;
      value = operator === '*' ? value * right : value / right;
      if (!Number.isFinite(value)) return null;
    }

    return value;
  }

  function parseSum(): number | null {
    let value = parseProduct();
    if (value === null) return null;

    while (expression[position] === '+' || expression[position] === '-') {
      const operator = expression[position];
      position += 1;
      const right = parseProduct();
      if (right === null) return null;
      value = operator === '+' ? value + right : value - right;
      if (!Number.isFinite(value)) return null;
    }

    return value;
  }

  const result = parseSum();
  return result !== null && position === expression.length && result >= 0 ? result : null;
}
