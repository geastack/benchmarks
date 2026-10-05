// Minimal, fast JSON serialize/parse helpers for the hand-written native
// fixtures. Serialization matches V8's JSON.stringify byte-for-byte for the
// shapes used here (compact, no spaces, insertion key order, ASCII payloads with
// no characters needing escaping) so that text.length / charCodeAt reads produce
// identical results. The parser assumes that same clean compact form.
#pragma once
#include <string>
#include <charconv>

namespace ju {

// Fast integer formatting: 2-digit lookup table, two digits per iteration.
// Beats std::to_chars (digit-at-a-time) on the small integers JSON arrays hold.
inline const char *twoDigitTable() {
  static const char t[201] = "0001020304050607080910111213141516171819"
                             "2021222324252627282930313233343536373839"
                             "4041424344454647484950515253545556575859"
                             "6061626364656667686970717273747576777879"
                             "8081828384858687888990919293949596979899";
  return t;
}

inline void appendUInt(std::string &o, long long v) {
  char b[24];
  char *p = b + sizeof(b);
  unsigned long long u = v < 0 ? (unsigned long long)(-v) : (unsigned long long)v;
  const char *T = twoDigitTable();
  while (u >= 100) {
    unsigned idx = (unsigned)(u % 100) * 2;
    u /= 100;
    *--p = T[idx + 1];
    *--p = T[idx];
  }
  if (u >= 10) {
    unsigned idx = (unsigned)u * 2;
    *--p = T[idx + 1];
    *--p = T[idx];
  } else {
    *--p = char('0' + u);
  }
  if (v < 0)
    *--p = '-';
  o.append(p, (size_t)(b + sizeof(b) - p));
}

// Quoted string; no escaping (payloads are ASCII alnum/hyphen).
inline void appendStr(std::string &o, const std::string &s) {
  o += '"';
  o += s;
  o += '"';
}

struct Cursor {
  const char *p;
  const char *e;
};

inline bool eat(Cursor &c, char ch) {
  if (c.p < c.e && *c.p == ch) {
    c.p++;
    return true;
  }
  return false;
}

inline long long parseInt(Cursor &c) {
  bool neg = false;
  if (c.p < c.e && *c.p == '-') {
    neg = true;
    c.p++;
  }
  long long v = 0;
  while (c.p < c.e && *c.p >= '0' && *c.p <= '9') {
    v = v * 10 + (*c.p - '0');
    c.p++;
  }
  return neg ? -v : v;
}

// Reads a quoted string (no escapes) into out; advances past closing quote.
inline void parseStr(Cursor &c, std::string &out) {
  if (c.p < c.e && *c.p == '"')
    c.p++;
  const char *s = c.p;
  while (c.p < c.e && *c.p != '"')
    c.p++;
  out.assign(s, (size_t)(c.p - s));
  if (c.p < c.e)
    c.p++;
}

inline void skipStr(Cursor &c) {
  if (c.p < c.e && *c.p == '"')
    c.p++;
  while (c.p < c.e && *c.p != '"')
    c.p++;
  if (c.p < c.e)
    c.p++;
}

// Skip the JSON literals true / false (return their value for bool arrays).
inline bool parseBool(Cursor &c) {
  if (c.p < c.e && *c.p == 't') {
    c.p += 4;
    return true;
  } // "true"
  c.p += 5; // "false"
  return false;
}

} // namespace ju
