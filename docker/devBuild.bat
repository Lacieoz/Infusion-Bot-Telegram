#!/bin/sh

cd ..
docker build --tag bot-tis.dev -f docker\Dockerfile.dev .

PAUSE
