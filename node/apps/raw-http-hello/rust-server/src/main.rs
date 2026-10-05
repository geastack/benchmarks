// The raw-http-hello routes on hyper 1.x (HTTP/1 only). SINGLE_THREAD=1 runs a
// current-thread tokio runtime; otherwise TOKIO_WORKER_THREADS sets the worker count.
use http_body_util::Full;
use hyper::body::Bytes;
use hyper::header::{CONNECTION, CONTENT_TYPE, DATE, TRANSFER_ENCODING};
use hyper::server::conn::http1;
use hyper::service::service_fn;
use hyper::{Request, Response};
use hyper_util::rt::TokioIo;
use std::cell::RefCell;
use std::convert::Infallible;
use std::net::SocketAddr;
use std::time::{SystemTime, UNIX_EPOCH};
use tokio::net::TcpListener;

thread_local! {
    static DATE_CACHE: RefCell<(u64, String)> = RefCell::new((0, String::new()));
}

fn cached_date() -> String {
    let now = SystemTime::now();
    let secs = now.duration_since(UNIX_EPOCH).unwrap().as_secs();
    DATE_CACHE.with(|cache| {
        let mut cache = cache.borrow_mut();
        if cache.0 != secs {
            cache.0 = secs;
            cache.1 = httpdate::fmt_http_date(now);
        }
        cache.1.clone()
    })
}

fn response(content_type: &'static str, body: Bytes) -> Response<Full<Bytes>> {
    Response::builder()
        .header(CONTENT_TYPE, content_type)
        .header(DATE, cached_date())
        .header(CONNECTION, "keep-alive")
        .header("keep-alive", "timeout=5")
        .header(TRANSFER_ENCODING, "chunked")
        .body(Full::new(body))
        .unwrap()
}

async fn handle(req: Request<hyper::body::Incoming>) -> Result<Response<Full<Bytes>>, Infallible> {
    if req.uri().path() == "/json" {
        return Ok(response(
            "application/json; charset=utf-8",
            Bytes::from_static(b"{\"hello\":\"world\"}"),
        ));
    }
    let body = format!("Hello, World! {} {}", req.method(), req.uri().path());
    Ok(response("text/plain; charset=utf-8", Bytes::from(body)))
}

async fn run() {
    let addr = SocketAddr::from(([127, 0, 0, 1], 3101));
    let listener = TcpListener::bind(addr).await.unwrap();
    println!("listening on http://127.0.0.1:3101");
    loop {
        let (stream, _) = listener.accept().await.unwrap();
        let io = TokioIo::new(stream);
        tokio::spawn(async move {
            let _ = http1::Builder::new()
                .serve_connection(io, service_fn(handle))
                .await;
        });
    }
}

fn main() {
    let single = std::env::var("SINGLE_THREAD").is_ok();
    let rt = if single {
        tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap()
    } else {
        tokio::runtime::Builder::new_multi_thread()
            .enable_all()
            .build()
            .unwrap()
    };
    rt.block_on(run());
}
