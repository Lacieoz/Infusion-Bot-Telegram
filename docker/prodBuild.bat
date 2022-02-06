#!/bin/sh

cd ..
docker build --tag bot-tis.prod -f .\docker\Dockerfile.prod .

PAUSE
