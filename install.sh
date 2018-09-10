#!/bin/bash

# Update package sources
echo "Updating package sources"
apt-get -y update

# Upgrade system
echo "Upgrading system"
apt-get -y upgrade

# Install nmap, hostapd, dnsmasq, libpcap-dev, wireless-tools, avahi-daemon, avahi-utils, git, mongodb
echo "Installing external dependencies"
apt-get install -y nmap hostapd dnsmasq libpcap-dev wireless-tools avahi-daemon avahi-utils git mongodb apache2

# Disabling network services on startup
echo "Disabling network services on startup"
systemctl disable networking.service
systemctl disable hostapd.service
systemctl disable dnsmasq.service

# Remove previous versions of Node.js
echo "Removing Node.js if installed"
apt-get remove -y nodejs

# Install latest version of Node.js
echo "Installing latest version of Node.js from deb.nodesource.com"
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash -
sudo apt-get install -y nodejs

# Checkout GoProxi from Github
echo "Checking out GoProxi from Github"
cd /opt/
git clone https://github.com/henrikkorsgaard/goproxi.git

# Adding the Goproxi service
echo "Copying goproxi service to /etc/systemd/system"
cp /opt/goproxi/goproxi.service /etc/systemd/system
systemctl enable goproxi.service

# Checkout Webstrates from Github
echo "Checking out Webstrates from Github"
cd /opt/
git clone https://github.com/Webstrates/Webstrates.git

# Installing Webstrates
echo "Installing Webstrates production"
cd /opt/Webstrates
# We enter su and sudo install to avoid permission issues with npm (in /opt/ and /root/)
su -c $(sudo npm install --production;exit)

npm run build

# Adding the webstrates service
echo "Copying webstrates service to /etc/systemd/system"
cp /opt/goproxi/webstrates.service /etc/systemd/system
systemctl enable webstrates.service

systemctl daemon-reload

# Adding the webstrates service
echo "Disabling Apache2 on startup"
systemctl disable apache2.service
a2enmod expires
a2enmod ssl
a2enmod headers
a2enmod proxy
a2enmod proxy_http

#Listen ports
echo "Listen 80\nListen1338\n<IfModule ssl_module>\n\tListen443\n</IfModule>\n\n<IfModule mod_gnutls.c>\n\tListen443\n</IfModule>"  | tee /etc/apache2/ports.conf


#ServerName
echo "ServerName localhost" | tee /etc/apache2/conf-available/servername.conf
a2enconf servername


echo "Rebooting now"
reboot now



