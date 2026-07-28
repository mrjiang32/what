import { MongoClient } from "mongodb";

let client;
let actiondb;
let hookdb;

async function main(uri) {
  client = new MongoClient(uri);
  await client.connect();

  const whatdb = client.db("what");

  hookdb = whatdb.collection("hook");
  actiondb = whatdb.collection("actiondb");

  return { actiondb, hookdb };
}

async function close() {
  if (client) {
    await client.close();
    client = null;
  }
}

export default {
  get actiondb() {
    return actiondb;
  },
  get hookdb() {
    return hookdb;
  },
  main,
  close,
};
