import { Rule } from './Rule.mjs';

const tokenRule = Rule.object({
  userId: Rule.string().minLength(3).maxLength(20).finish(),
  token: Rule.string().length(32).hashlike('md5').finish(),
  meta: Rule.object({
    provider: Rule.string().enum(['github', 'gitlab', 'google']).finish(),
    flags: Rule.object({
      isAdmin: Rule.boolean().finish(),
      enabled: Rule.boolean().finish(),
    }).finish(),
  }).finish(),
}).finish().named('SessionToken');

const nestedRule = Rule.object({
  app: Rule.object({
    id: Rule.string().minLength(2).finish(),
    secret: Rule.string().hashlike('sha1').finish(),
    services: Rule.array('string').finish(),
  }).finish(),
  audit: Rule.object({
    requestId: Rule.string().length(32).finish(),
    hash: Rule.string().hashlike('sha256').finish(),
  }).finish(),
}).finish().named('ComplexCheck');

const validPayload = {
  userId: 'alice',
  token: 'a'.repeat(32),
  meta: {
    provider: 'github',
    flags: {
      isAdmin: true,
      enabled: false,
    },
  },
};

const invalidPayload = {
  userId: 'ad',
  token: 'abc',
  meta: {
    provider: 'twitter',
    flags: {
      isAdmin: 'yes',
      enabled: false,
    },
  },
};

const complexPayload = {
  app: {
    id: 'web',
    secret: 'b'.repeat(40),
    services: ['auth', 'sync', 'storage'],
  },
  audit: {
    requestId: 'c'.repeat(32),
    hash: 'd'.repeat(64),
  },
};

const complexInvalidPayload = {
  app: {
    id: 'w',
    secret: 'bad-hash',
    services: ['auth', 42, 'storage'],
  },
  audit: {
    requestId: 'short',
    hash: 'd'.repeat(32),
  },
};

const unionRule = Rule.object({
  selector: Rule.or([
    Rule.string().hashlike('md5').finish(),
    Rule.number().min(1).finish(),
  ]).named('selectorUnion'),
}).finish().named('UnionCheck');

const reverseRule = new Rule('ReverseLenCheck').reverse(Rule.string().minLength(3).finish()).finish();

console.log('=== valid session token ===');
console.log(tokenRule.test(validPayload));
tokenRule.verbose(validPayload);

console.log('\n=== invalid session token ===');
console.log(tokenRule.test(invalidPayload));
tokenRule.verbose(invalidPayload);

console.log('\n=== valid complex rule ===');
console.log(nestedRule.test(complexPayload));
nestedRule.verbose(complexPayload);

console.log('\n=== invalid complex rule ===');
console.log(nestedRule.test(complexInvalidPayload));
nestedRule.verbose(complexInvalidPayload);

console.log('\n=== union rule ===');
console.log(unionRule.test({ selector: 'a'.repeat(32) }));
unionRule.verbose({ selector: 'a'.repeat(32) });
console.log(unionRule.test({ selector: 3 }));
unionRule.verbose({ selector: 3 });

console.log('\n=== reverse rule ===');
console.log(reverseRule.test('ab'));
reverseRule.verbose('ab');
console.log(reverseRule.test('abcd'));
reverseRule.verbose('abcd');

console.log('\n=== summary ===');
console.log({
  validSession: tokenRule.test(validPayload),
  invalidSession: tokenRule.test(invalidPayload),
  validComplex: nestedRule.test(complexPayload),
  invalidComplex: nestedRule.test(complexInvalidPayload),
  validUnion: unionRule.test({ selector: 'a'.repeat(32) }),
  numberUnion: unionRule.test({ selector: 3 }),
  reverseShort: reverseRule.test('ab'),
  reverseLong: reverseRule.test('abcd'),
});
