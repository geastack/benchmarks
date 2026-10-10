# SPDX-License-Identifier: Apache-2.0
FROM ubuntu:24.04

ARG DEBIAN_FRONTEND=noninteractive
ARG NODE_VERSION=24.20.0
ARG RUST_VERSION=1.90.0
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl git xz-utils clang-18 lld-18 build-essential \
    python3 time coreutils util-linux iproute2 wrk \
    libdrogon-dev libjsoncpp-dev uuid-dev zlib1g-dev libssl-dev \
    && rm -rf /var/lib/apt/lists/*
RUN curl -fsSLO "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" \
    && curl -fsS "https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt" \
      | sed -n "/ node-v${NODE_VERSION}-linux-x64.tar.xz$/p" | sha256sum -c - \
    && tar -xJf "node-v${NODE_VERSION}-linux-x64.tar.xz" -C /usr/local --strip-components=1 \
    && rm "node-v${NODE_VERSION}-linux-x64.tar.xz"
RUN curl -fsSL https://sh.rustup.rs | sh -s -- -y \
    --profile minimal --default-toolchain "${RUST_VERSION}"

ENV CXX=clang++-18 CC=clang-18 SCRIPTC_LINKER=/usr/bin/clang-18
ENV PATH="/root/.cargo/bin:${PATH}"
