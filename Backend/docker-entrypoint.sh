#!/bin/sh
set -eu

# The application directory is bind-mounted in development, so create the
# public storage link at runtime instead of relying on a link in the image.
mkdir -p storage/app/public
php artisan storage:link --force

exec docker-php-entrypoint "$@"
