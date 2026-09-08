FROM php:8.4-apache

WORKDIR /var/www/html

RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libpq-dev \
    libsqlite3-dev \
    libzip-dev \
    zip \
    curl \
    && docker-php-ext-install \
    pdo_pgsql \
    pdo_sqlite \
    zip \
    exif \
    && a2enmod rewrite \
    && rm -rf /var/lib/apt/lists/*

RUN curl -sS https://getcomposer.org/installer | php \
    -- --install-dir=/usr/local/bin \
    --filename=composer

COPY apache-vhost.conf /etc/apache2/sites-available/000-default.conf
COPY docker-entrypoint.sh /usr/local/bin/csm-docker-entrypoint

RUN chmod +x /usr/local/bin/csm-docker-entrypoint

COPY . /var/www/html

RUN composer install \
    --no-interaction \
    --prefer-dist \
    --optimize-autoloader

RUN chown -R www-data:www-data \
    /var/www/html/storage \
    /var/www/html/bootstrap/cache

EXPOSE 80

ENTRYPOINT ["csm-docker-entrypoint"]
CMD ["apache2-foreground"]
