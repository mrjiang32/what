import path from "path";
import global from "../global.js";

export class ScanRule {
  constructor(rule) {
  }

  test(object) {
    throw new Error("子类必须实现 test() 方法");
  }

  process(object) {
    throw new Error("子类必须实现 process() 方法");
  }

  compare(objectA, objectB) {
    throw new Error("子类必须实现 compare() 方法");
  }

  getDir() {
    throw new Error("子类必须实现 getDir() 方法");
  }
}