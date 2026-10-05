// The raw-http-hello routes on axum, using its Router. SINGLE_THREAD=1 runs a
// current-thread tokio runtime; otherwise TOKIO_WORKER_THREADS sets the worker count.
use axum::body::{Body, Bytes};
use axum::http::{header, Method, Uri};
use axum::response::Response;
use axum::{routing::get, Router};
use std::cell::RefCell;
use std::convert::Infallible;
use std::pin::Pin;
use std::task::{Context, Poll};
use std::time::{SystemTime, UNIX_EPOCH};

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

struct OneChunk(Option<Bytes>);

impl hyper::body::Body for OneChunk {
    type Data = Bytes;
    type Error = Infallible;

    fn poll_frame(
        self: Pin<&mut Self>,
        _cx: &mut Context<'_>,
    ) -> Poll<Option<Result<hyper::body::Frame<Self::Data>, Self::Error>>> {
        Poll::Ready(
            self.get_mut()
                .0
                .take()
                .map(hyper::body::Frame::data)
                .map(Ok),
        )
    }
}

fn response(content_type: &'static str, body: String) -> Response {
    Response::builder()
        .header(header::CONTENT_TYPE, content_type)
        .header(header::DATE, cached_date())
        .header(header::CONNECTION, "keep-alive")
        .header("keep-alive", "timeout=5")
        .body(Body::new(OneChunk(Some(Bytes::from(body)))))
        .unwrap()
}

async fn root(method: Method, uri: Uri) -> Response {
    response(
        "text/plain; charset=utf-8",
        format!("Hello, World! {} {}", method, uri.path()),
    )
}

async fn json_route() -> Response {
    response(
        "application/json; charset=utf-8",
        "{\"hello\":\"world\"}".to_owned(),
    )
}

async fn run() {
    let app = Router::new()
        .route("/", get(root))
        .route("/json", get(json_route));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:3101")
        .await
        .unwrap();
    println!("axum listening on http://127.0.0.1:3101");
    axum::serve(listener, app).await.unwrap();
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
