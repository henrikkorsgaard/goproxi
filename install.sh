#!/bin/bash

# Update package sources
echo "Updating package sources"
apt-get update

# Upgrade system
echo "Upgrading system"
apt-get -y upgrade

# Install nmap, hostapd, dnsmasq, libpcap-dev, wireless-tools, avahi-daemon, avahi-utils, git, mongodb
echo "Installing external dependencies"
apt-get install -y nmap hostapd dnsmasq libpcap-dev wireless-tools avahi-daemon avahi-utils git mongodb

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
cd /opt/
npm install --production 
npm run build

# Adding the webstrates service
echo "Copying webstrates service to /etc/systemd/system"
cp /opt/goproxi/webstrates.service /etc/systemd/system
systemctl enable webstrates.service

systemctl daemon-reload
reboot now



