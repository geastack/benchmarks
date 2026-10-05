// The raw-http-hello routes on a hand-written epoll loop with keep-alive: a floor for
// what any server on this machine can do. CPP_WORKERS forks that many SO_REUSEPORT
// processes.
#define _GNU_SOURCE
#include <arpa/inet.h>
#include <fcntl.h>
#include <netinet/in.h>
#include <netinet/tcp.h>
#include <sys/epoll.h>
#include <sys/socket.h>
#include <unistd.h>
#include <csignal>
#include <cstdio>
#include <ctime>
#include <cstdlib>
#include <cstring>
#include <string>
#include <vector>

static int make_listener(int port) {
  int fd = ::socket(AF_INET, SOCK_STREAM | SOCK_NONBLOCK, 0);
  int one = 1;
  ::setsockopt(fd, SOL_SOCKET, SO_REUSEADDR, &one, sizeof(one));
  ::setsockopt(fd, SOL_SOCKET, SO_REUSEPORT, &one, sizeof(one));
  sockaddr_in addr{};
  addr.sin_family = AF_INET;
  addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
  addr.sin_port = htons(port);
  ::bind(fd, reinterpret_cast<sockaddr *>(&addr), sizeof(addr));
  ::listen(fd, 1024);
  return fd;
}

static const std::string &cached_date() {
  static time_t second = 0;
  static std::string value;
  const time_t now = ::time(nullptr);
  if (now != second) {
    second = now;
    char text[32];
    tm utc{};
    ::gmtime_r(&now, &utc);
    ::strftime(text, sizeof(text), "%a, %d %b %Y %H:%M:%S GMT", &utc);
    value = text;
  }
  return value;
}

static void append_response(std::string &out, const char *content_type, const std::string &body) {
  out += "HTTP/1.1 200 OK\r\ncontent-type: ";
  out += content_type;
  out += "\r\nDate: ";
  out += cached_date();
  out += "\r\nConnection: keep-alive\r\nKeep-Alive: timeout=5\r\n"
         "Transfer-Encoding: chunked\r\n\r\n";
  char length[32];
  const int digits = ::snprintf(length, sizeof(length), "%zx", body.size());
  out.append(length, static_cast<size_t>(digits));
  out += "\r\n";
  out += body;
  out += "\r\n0\r\n\r\n";
}

int main() {
  ::signal(SIGPIPE, SIG_IGN);
  int workers = 1;
  if (const char *w = ::getenv("CPP_WORKERS")) {
    workers = ::atoi(w);
    if (workers < 1)
      workers = 1;
  }
  for (int i = 1; i < workers; i++) {
    if (::fork() == 0)
      break;
  }

  int lfd = make_listener(3101);
  int ep = ::epoll_create1(0);
  epoll_event ev{};
  ev.events = EPOLLIN;
  ev.data.fd = lfd;
  ::epoll_ctl(ep, EPOLL_CTL_ADD, lfd, &ev);

  std::vector<epoll_event> events(1024);
  std::vector<std::string> inbuf(1 << 12);
  char rbuf[65536];

  for (;;) {
    int n = ::epoll_wait(ep, events.data(), static_cast<int>(events.size()), -1);
    for (int i = 0; i < n; i++) {
      int fd = events[i].data.fd;
      if (fd == lfd) {
        for (;;) {
          int cfd = ::accept4(lfd, nullptr, nullptr, SOCK_NONBLOCK);
          if (cfd < 0)
            break;
          int one = 1;
          ::setsockopt(cfd, IPPROTO_TCP, TCP_NODELAY, &one, sizeof(one));
          if (static_cast<size_t>(cfd) >= inbuf.size())
            inbuf.resize(cfd + 1);
          inbuf[cfd].clear();
          epoll_event cev{};
          cev.events = EPOLLIN;
          cev.data.fd = cfd;
          ::epoll_ctl(ep, EPOLL_CTL_ADD, cfd, &cev);
        }
        continue;
      }
      std::string &buf = inbuf[fd];
      bool closed = false;
      for (;;) {
        ssize_t r = ::read(fd, rbuf, sizeof(rbuf));
        if (r > 0) {
          buf.append(rbuf, static_cast<size_t>(r));
          continue;
        }
        if (r == 0)
          closed = true;
        break;
      }
      if (closed) {
        ::close(fd);
        buf.clear();
        continue;
      }
      std::string out;
      size_t pos;
      while ((pos = buf.find("\r\n\r\n")) != std::string::npos) {
        size_t sp1 = buf.find(' ');
        size_t sp2 = buf.find(' ', sp1 + 1);
        std::string method = buf.substr(0, sp1);
        std::string path = buf.substr(sp1 + 1, sp2 - sp1 - 1);
        if (path == "/json") {
          append_response(out, "application/json; charset=utf-8", "{\"hello\":\"world\"}");
        } else {
          std::string body = "Hello, World! " + method + " " + path;
          append_response(out, "text/plain; charset=utf-8", body);
        }
        buf.erase(0, pos + 4);
      }
      if (!out.empty()) {
        size_t off = 0;
        while (off < out.size()) {
          ssize_t w = ::write(fd, out.data() + off, out.size() - off);
          if (w > 0)
            off += static_cast<size_t>(w);
          else
            break;
        }
      }
    }
  }
}
