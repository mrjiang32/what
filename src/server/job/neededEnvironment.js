// context.js
const neededEnvironment = {};

export const modifyContext = (key, value) => {
  neededEnvironment[key] = value;
};

export default neededEnvironment;