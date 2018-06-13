#!/bin/bash

# Checking for network connectivity
echo "Checking for network connectivity"
test=google.com
if nc -zw1 $test 443 && echo |openssl s_client -connect $test:443 2>&1 |awk '
  handshake && $1 == "Verification" { if ($2=="OK") exit; exit 1 }
  $1 $2 == "SSLhandshake" { handshake = 1 }'
then
  echo "we have connectivity"
fi

# Updating GoProxi from Github
echo "Updating GoProxi from Github"
cd /opt/goproxi
git pull

