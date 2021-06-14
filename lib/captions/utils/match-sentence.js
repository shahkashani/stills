const PREFIXES = [
  '-?\\(.*?\\)\\s*',
  '-?\\[.*?\\]\\s*',
  '\\-?\\.\\s*\\.\\s*\\.\\s*',
  '\\-\\s*'
];

const POSTFIXES = [
  '\\s*\\(.*?\\)',
  '\\s*\\[.*?\\]',
  '\\.\\s*\\.\\s*\\.\\s*',
  ',',
  '\\.',
  ',',
  '\\s*\\-\\-',
  '\\!+',
  '\\?+'
];

const CONJUNCTIONS = ['and', 'because', 'but'];
const CONNECTOR = 'and';

const getPrefixes = () => {
  const conjuctions = CONJUNCTIONS.map((c) => `${c}\\s*`);
  return [...PREFIXES, ...conjuctions];
};

const getPostfixes = () => {
  const conjuctions = CONJUNCTIONS.map((c) => `\\s*${c}`);
  return [...POSTFIXES, ...conjuctions];
};

const getPrefix = (sentence) => {
  for (let prefix of getPrefixes()) {
    const regexp = new RegExp(`^(${prefix}\\s*)`, 'i');
    const match = sentence.match(regexp);
    if (match && match[0] !== sentence) {
      return match[0];
    }
  }
  return '';
};

const getPostfix = (sentence) => {
  for (let postfix of getPostfixes()) {
    const regexp = new RegExp(`(${postfix})$`, 'i');
    const match = sentence.match(regexp);
    if (match && match[0] !== sentence) {
      return match[0];
    }
  }
  return '';
};

const stripPostfix = (sentence) => {
  for (let postfix of getPostfixes()) {
    sentence = sentence.replace(new RegExp(`(${postfix})$`, 'i'), '');
  }
  return sentence;
};

const stripPrefix = (sentence) => {
  for (let prefix of getPrefixes()) {
    sentence = sentence.replace(new RegExp(`^(${prefix})`, 'i'), '');
  }
  return sentence;
};

const replaceLetter = (sentence, index, replacement) => {
  return `${sentence.slice(0, index)}${replacement}${sentence.slice(
    index + 1
  )}`;
};

const getSanitizedSentence = (sentence) => {
  return sentence.replace(/[\(\[].*[\)\]]/g, '').replace(/[^A-z]/g, '');
};

const isUpperCase = (sentence) => {
  const sanitized = getSanitizedSentence(sentence);
  return sanitized.length > 0 && sanitized.toUpperCase() === sanitized;
};

const matchFirstLetter = (sentence, blueprint) => {
  if (isUpperCase(sentence)) {
    return sentence;
  }
  const [matchLetter] = /[A-z]/.exec(blueprint) || [];
  if (!matchLetter) {
    return sentence;
  }
  const { index } = /[A-z]/.exec(sentence) || {};
  if (!Number.isFinite(index)) {
    return sentence;
  }
  if (matchLetter === matchLetter.toUpperCase()) {
    return replaceLetter(sentence, index, sentence[index].toUpperCase());
  } else {
    return replaceLetter(sentence, index, sentence[index].toLowerCase());
  }
};

const addPrefix = (sentence, blueprint) => {
  return `${getPrefix(blueprint)}${stripPrefix(sentence)}`;
};

const addPostfix = (sentence, blueprint) => {
  return `${stripPostfix(sentence)}${getPostfix(blueprint)}`;
};

const addUppercase = (sentence, blueprint) => {
  if (isUpperCase(blueprint)) {
    return sentence.toUpperCase();
  }
  return sentence;
};

const getCorrectCapitalization = (sentence) => {
  return sentence.replace(/i([\s'’])/g, 'I$1');
};

const addConnectors = (sentence) => {
  const word = sentence.split(' ')[0];
  if (!word.match(/^[A-z]/)) {
    return sentence;
  }
  if (word.match(/^[A-Z]/)) {
    return sentence;
  }
  for (let prefix of getPrefixes()) {
    const regexp = new RegExp(`^(${prefix})`, 'i');
    if (sentence.match(regexp)) {
      return sentence;
    }
  }
  return `${CONNECTOR} ${sentence}`;
};

const matchSentence = (sentence, blueprint) => {
  let output = sentence;
  if (sentence.match(/[\[\]]/) || blueprint.match(/^\[.*\]$/)) {
    return sentence;
  }
  output = matchFirstLetter(output, blueprint);
  output = addUppercase(output, blueprint);
  output = addPrefix(output, blueprint);
  output = addPostfix(output, blueprint);
  output = addConnectors(output);
  output = getCorrectCapitalization(output);
  return output;
};

module.exports = matchSentence;
