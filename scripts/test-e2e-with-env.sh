#!/bin/bash
set -a
source .env.test
set +a
export API_URL=http://localhost:3005
npm run test-e2e
