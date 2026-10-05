// The raw-http-hello routes on Drogon, a full C++ web framework.
// DROGON_THREADS sets the number of event-loop threads.
#include <drogon/drogon.h>
#include <cstdlib>
#include <cstdio>
#include <ctime>

using namespace drogon;

static const std::string &cachedDate() {
  thread_local time_t second = 0;
  thread_local std::string value;
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

static HttpResponsePtr nodeCompatibleResponse(const char *contentType, std::string body) {
  auto resp = HttpResponse::newHttpResponse();
  resp->setStatusCode(k200OK);
  resp->addHeader("content-type", contentType);
  resp->addHeader("Date", cachedDate());
  resp->addHeader("Connection", "keep-alive");
  resp->addHeader("Keep-Alive", "timeout=5");
  resp->addHeader("Transfer-Encoding", "chunked");
  char length[32];
  const int digits = ::snprintf(length, sizeof(length), "%zx", body.size());
  std::string encoded(length, static_cast<size_t>(digits));
  encoded += "\r\n";
  encoded += body;
  encoded += "\r\n0\r\n\r\n";
  resp->setBody(std::move(encoded));
  resp->removeHeader("content-length");
  resp->setPassThrough(true);
  return resp;
}

int main() {
  app().registerHandler(
      "/",
      [](const HttpRequestPtr &req, std::function<void(const HttpResponsePtr &)> &&callback) {
        callback(nodeCompatibleResponse("text/plain; charset=utf-8", std::string("Hello, World! ") +
                                                                         req->getMethodString() +
                                                                         " " + req->getPath()));
      },
      {Get});

  app().registerHandler(
      "/json",
      [](const HttpRequestPtr &, std::function<void(const HttpResponsePtr &)> &&callback) {
        callback(
            nodeCompatibleResponse("application/json; charset=utf-8", "{\"hello\":\"world\"}"));
      },
      {Get});

  int threads = 1;
  if (const char *t = std::getenv("DROGON_THREADS"))
    threads = std::atoi(t);

  app()
      .setLogLevel(trantor::Logger::kError) // no per-request access logging in the hot path
      .addListener("127.0.0.1", 3101)
      .setThreadNum(threads)
      .run();
  return 0;
}
