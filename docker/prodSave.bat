#!/bin/sh

set CUR_YYYY=%date:~6,4%
set CUR_MM=%date:~3,2%
set CUR_DD=%date:~0,2%
set CUR_HH=%time:~0,2%
set CUR_NN=%time:~3,2%
set CUR_SS=%time:~6,2%
set SUBFILENAME=%CUR_YYYY%%CUR_MM%%CUR_DD%-%CUR_HH%%CUR_NN%%CUR_SS%

cd ..
docker build --tag bot-tis.prod -f .\docker\Dockerfile.prod .
docker save bot-tis.prod:latest > docker\images\bot-tisane_%SUBFILENAME%.tar

PAUSE
