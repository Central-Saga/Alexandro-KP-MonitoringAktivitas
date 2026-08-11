FROM php:8.4-apache

WORKDIR /var/www/html

# Install dependencies sistem dan PHP extensions
RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libpq-dev \
    libzip-dev \
    zip \
    curl \
    && docker-php-ext-install \
        pdo_pgsql \
        zip \
    && a2enmod rewrite \
    && rm -rf /var/lib/apt/lists/*

# Install Composer
RUN curl -sS https://getcomposer.org/installer | php \
    -- --install-dir=/usr/local/bin \
    --filename=composer

# Konfigurasi Apache untuk Laravel
RUN sed -i 's|DocumentRoot /var/www/html|DocumentRoot /var/www/html/public|' \
    /etc/apache2/sites-available/000-default.conf

RUN sed -i 's|<Directory /var/www/>|<Directory /var/www/html/public>|' \
    /etc/apache2/apache2.conf

# Copy project Laravel
COPY . /var/www/html

# Install dependency Laravel
RUN composer install \
    --no-interaction \
    --prefer-dist \
    --optimize-autoloader

# Permission Laravel
RUN chown -R www-data:www-data /var/www/html/storage \
    /var/www/html/bootstrap/cache

EXPOSE 80

CMD ["apache2-foreground"]
