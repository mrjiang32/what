// context.js
let neededEnvironment = {};

export const modifyContext = (key, value) => {
  neededEnvironment[key] = value;
};

export const addContext = (obj) => {
  Object.assign(neededEnvironment, obj)
}

export default neededEnvironment;
