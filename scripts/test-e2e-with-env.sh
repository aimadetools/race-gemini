#!/bin/bash
set -a
source .env.test
set +a
npm run test-e2e
