#!/usr/bin/env bash

set -o errexit -o pipefail -o nounset

zip -r packaged-extension.zip manifest.json content.js icons
