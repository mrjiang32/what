import path from 'path';

export default {
  scan: {
    dir: import.meta.dirname,
    workdir: path.resolve(import.meta.dirname, '../scripts'),
  }
};