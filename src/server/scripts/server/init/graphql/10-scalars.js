import { GraphQLScalarType, Kind } from 'graphql';

export const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'Arbitrary JSON value',
  parseValue: (v) => v,
  serialize: (v) => v,
  parseLiteral(ast) {
    switch (ast.kind) {
      case Kind.STRING:
      case Kind.BOOLEAN:
      case Kind.INT:
      case Kind.FLOAT:
        return ast.value;
      case Kind.OBJECT: {
        const value = Object.create(null);
        ast.fields.forEach((field) => {
          value[field.name.value] = parseLiteral(field.value);
        });
        return value;
      }
      case Kind.LIST:
        return ast.values.map(parseLiteral);
      default:
        return null;
    }
    function parseLiteral(node) {
      if (node.kind === Kind.STRING) return node.value;
      if (node.kind === Kind.BOOLEAN) return node.value;
      if (node.kind === Kind.INT || node.kind === Kind.FLOAT) return Number(node.value);
      if (node.kind === Kind.OBJECT) {
        const obj = Object.create(null);
        node.fields.forEach((f) => (obj[f.name.value] = parseLiteral(f.value)));
        return obj;
      }
      if (node.kind === Kind.LIST) return node.values.map(parseLiteral);
      return null;
    }
  }
});
