// JSON serialize/parse helpers for the hand-written native fixtures.
// Serialization matches V8's JSON.stringify byte-for-byte for the shapes used
// here (compact, no spaces, insertion key order) so that text.length /
// charCodeAt reads produce identical results.
//
// The parity fixtures use appendQuoted (escapes like JSON.stringify) and
// appendInt (std::to_chars). The idiomatic fixtures use appendUInt (a
// two-digit table) and copy strings unescaped, which is correct only for the
// ASCII alphanumeric payloads these fixtures happen to carry.
#pragma once
#include <string>
#include <string_view>
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

// ---- Parity helpers: what JSON.stringify does for every string and integer.

// JSON.stringify's string quoting: every character is scanned, `"` and `\`
// are escaped, and so is every control character below 0x20 (\b \f \n \r \t,
// the rest as \u00XX). Unescaped runs are copied as blocks.
inline void appendQuoted(std::string &o, std::string_view s) {
  static const char hex[] = "0123456789abcdef";
  o += '"';
  size_t run = 0;
  for (size_t k = 0; k < s.size(); k++) {
    unsigned char c = (unsigned char)s[k];
    if (c != '"' && c != '\\' && c >= 0x20)
      continue;
    o.append(s.data() + run, k - run);
    run = k + 1;
    switch (c) {
    case '"':
      o += "\\\"";
      break;
    case '\\':
      o += "\\\\";
      break;
    case '\b':
      o += "\\b";
      break;
    case '\f':
      o += "\\f";
      break;
    case '\n':
      o += "\\n";
      break;
    case '\r':
      o += "\\r";
      break;
    case '\t':
      o += "\\t";
      break;
    default: {
      char u[6] = {'\\', 'u', '0', '0', hex[c >> 4], hex[c & 15]};
      o.append(u, 6);
    }
    }
  }
  o.append(s.data() + run, s.size() - run);
  o += '"';
}

// An integer-valued number, formatted by the standard library.
inline void appendInt(std::string &o, long long v) {
  char b[24];
  auto r = std::to_chars(b, b + sizeof(b), v);
  o.append(b, (size_t)(r.ptr - b));
}

// ---- Idiomatic helpers.

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
