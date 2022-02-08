function format(
  big: string,
  denomination: number,
  decimals: number,
  showLastNonZeroDecimal: boolean,
  addCommas: boolean,
) {
  showLastNonZeroDecimal =
    typeof showLastNonZeroDecimal !== 'undefined'
      ? showLastNonZeroDecimal
      : false;
  let array = big.toString().split('');
  if (denomination !== 0) {
    // make sure we have enough characters
    while (array.length < denomination + 1) {
      array.unshift('0');
    }
    // add our dot
    array.splice(array.length - denomination, 0, '.');
    // make sure there are enough decimals after the dot
    while (array.length - array.indexOf('.') <= decimals) {
      array.push('0');
    }

    if (showLastNonZeroDecimal) {
      let nonZeroDigitIndex = 0;
      for (let i = array.length - 1; i > 0; i--) {
        if (array[i] !== '0') {
          nonZeroDigitIndex = i + 1;
          break;
        }
      }
      const decimalsIndex = array.indexOf('.') + decimals + 1;
      const sliceIndex = Math.max(decimalsIndex, nonZeroDigitIndex);
      array = array.slice(0, sliceIndex);
    } else {
      // trim unnecessary characters after the dot
      array = array.slice(0, array.indexOf('.') + decimals + 1);
    }
  }
  if (addCommas) {
    // add comas every 3 characters
    array = array.reverse();
    const reference = denomination
      ? array.length - array.indexOf('.') - 1
      : array.length;
    const count = Math.floor(reference / 3);
    for (let i = 1; i <= count; i++) {
      const position = array.indexOf('.') + 3 * i + i;
      if (position !== array.length) {
        array.splice(position, 0, ',');
      }
    }
    array = array.reverse();
  }

  const allDecimalsZero = array
    .slice(array.indexOf('.') + 1)
    .every((digit) => digit.toString() === '0');

  const string = array.join('');

  if (allDecimalsZero) {
    return string.split('.')[0];
  }

  return decimals === 0 ? string.split('.').join('') : string;
}

interface DenominateType {
  input: string;
  denomination: number;
  decimals: number;
  showLastNonZeroDecimal: boolean;
  addCommas?: boolean;
}

export default function denominate({
  input,
  denomination,
  decimals,
  showLastNonZeroDecimal = false,
  addCommas = true,
}: DenominateType): string {
  if (input === '...') {
    return input;
  }
  if (input === '' || input === '0' || input === undefined) {
    input = '0';
  }
  return format(
    input,
    denomination,
    decimals,
    showLastNonZeroDecimal,
    addCommas,
  );
}

export function nominateVal(value: number): string {
  let response = value.toString(16);
  if (response.length % 2 !== 0) {
    response = '0' + response;
  }
  return response;
}

export function nominateStringVal(value: string): string {
  if (value?.length % 2 !== 0) {
    value = '0' + value;
  }
  return value;
}

export function nominateAmount(input: string) {
  const parts = input.toString().split('.');
  const denomination = 18;

  if (parts[1]) {
    while (
      parts[1].substring(parts[1].length - 1) === '0' &&
      parts[1].length > 1
    ) {
      parts[1] = parts[1].substring(0, parts[1].length - 1);
    }
  }

  let count = parts[1] ? denomination - parts[1].length : denomination;

  count = count < 0 ? 0 : count;

  let transformed = parts.join('') + '0'.repeat(count);

  // remove beginning zeros
  while (transformed.substring(0, 1) === '0' && transformed.length > 1) {
    transformed = transformed.substring(1);
  }

  return transformed;
}
