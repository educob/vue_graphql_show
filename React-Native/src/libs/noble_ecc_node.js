const createHash = require('create-hash');
const { createHmac } = require('crypto');
const necc = require('@noble/secp256k1');

necc.utils.sha256Sync = (...messages) => {
  const sha256 = createHash('sha256');
  for (const message of messages) sha256.update(message);
  return sha256.digest();
};

necc.utils.hmacSha256Sync = (key, ...messages) => {
  const hash = createHmac('sha256', Buffer.from(key));
  messages.forEach(m => hash.update(m));
  return Uint8Array.from(hash.digest());
};

const defaultTrue = (param) => param !== false;

function throwToNull(fn) {
  try {
    return fn();
  } catch (e) {
    // console.log(e);
    return null;
  }
}

function isPoint(p, xOnly) {
  if ((p.length === 32) !== xOnly) return false;
  try {
    return !!necc.Point.fromHex(p);
  } catch (e) {
    return false;
  }
}

const ecc = {
  isPoint: (p) => isPoint(p, false),
  isPrivate: (d) => {
    return necc.utils.isValidPrivateKey(d);
  },

  pointFromScalar: (sk, compressed) =>
    throwToNull(() => necc.getPublicKey(sk, defaultTrue(compressed))),

  pointCompress: (p, compressed) => {
    return necc.Point.fromHex(p).toRawBytes(defaultTrue(compressed));
  },

  pointMultiply: (a, tweak, compressed) =>
    throwToNull(() => necc.utils.pointMultiply(a, tweak, defaultTrue(compressed))),

  pointAdd: (a, b, compressed) =>
    throwToNull(() => {
      const A = necc.Point.fromHex(a);
      const B = necc.Point.fromHex(b);
      return A.add(B).toRawBytes(defaultTrue(compressed));
    }),

  pointAddScalar: (p, tweak, compressed) =>
    throwToNull(() => necc.utils.pointAddScalar(p, tweak, defaultTrue(compressed))),

  privateAdd: (d, tweak) =>
    throwToNull(() => {
      // console.log({ d, tweak });
      const ret = necc.utils.privateAdd(d, tweak);
      // console.log(ret);
      if (ret.join('') === '00000000000000000000000000000000') {
        return null;
      }
      return ret;
    }),

  sign: (h, d, e) => {
    return necc.signSync(h, d, { der: false, extraEntropy: e });
  },

  signSchnorr: (h, d, e = Buffer.alloc(32, 0x00)) => {
    return necc.schnorr.signSync(h, d, e);
  },

  verify: (h, Q, signature, strict) => {
    return necc.verify(signature, h, Q, { strict });
  },

  verifySchnorr: (h, Q, signature) => {
    return necc.schnorr.verifySync(signature, h, Q);
  },
};

module.exports = ecc;
