# a-library 

## About

**a-library** is simply that a library. Or more specifically, it is an offline digital library; a localised wifi network that hosts a free and open collection of documents. **a-library** was developed as a way for us to easily share books and articles with each other, and in the process to collectively develop a local archive of all the publications that are meaningful to us. By us, I mean you and I. even if we have not personally met, we have shared this location, and these texts are now between us.

**a-library** is currently installed in a number of physical locations. To access **a-library** visit [frontyard](www.frontyardprojects.org).

## Run locally

To install **a-library**  on your own server simply download the code and run the following commands:
```sh 
npm install
node index.js
```

## Setup Rpi as local library 

**a-library** is intended to be installed on a raspberry pi, configured as an open wifi access point.

**Note:** these instructions assume you are using a raspberry pi 3 with a clean install of the default operating system Jesse.

1. #### Install all required software:
	
	```sh 
	sudo apt-get update
	sudo apt-get install dnsmasq hostapd nginx git
	```

2. #### Install node js v4:
	
	```sh 
	cd ~
	wget https://nodejs.org/dist/v4.0.0/node-v4.0.0-linux-armv7l.tar.gz 
	tar -xvf node-v4.0.0-linux-armv7l.tar.gz 
	cd node-v4.0.0-linux-armv7l
	sudo cp -R * /usr/local/
	cd ..
	sudo rm -r node-v4.0.0-linux-armv7l
	```

3. #### Installing a-library:
	
	```sh
	git clone https://github.com/e-e-e/a-library
	cd a-library
	npm install
	```

4. #### Configure a-libary:
	
	set config.json with your own preferences
	
	```json
	{
		"server" :{
			"port":8080,
			"admin_path": "/management"
		},
		"database": {
			"location":"./tmp"
		}
	}
	```
	
	**server.admin_path** is the url path used for managing the library. It presents a simple GUI for renaming and deleting documents from within the database. It is recommended that you change this to an obsure key too limit access to administrative features.
	
	**location.database** is used to set the location of the sqlite3 database. It is recommend that you use an external USB or harddrive for the library as this will limit reading and writing to the system disk.

5. #### Automatically start a-library:
	
	We use PM2 process manager to keep **a-library** running.
	
	```sh 
	sudo npm install pm2 -g
	pm2 start index.js
	sudo pm2 startup systemd -u yourusername
	# follow instructions provide by pm2 to install startup script.
	pm2 save
	```
	
	Now **a-library** will be running automatically on start up, and will be relaunched if there are any problems.

5. #### Setup nginx as a reverse proxy:
	
	create new site settings
	
	```sh 
	sudo nano /etc/nginx/sites-available/alibrary
	```
	
	Include the following settings, importantly setting the media folder and port number to match your a-library settings:
	
	```nginx
	
	server {
		listen 443 ssl;
		ssl_certificate /etc/nginx/ssl/nginx.crt; 
		ssl_certificate_key /etc/nginx/ssl/nginx.key; 
		listen 80 default_server;
	
		# this is to fake captive portal
		if ($http_user_agent ~* (CaptiveNetworkSupport)) {
			return 200;
		}
	
		return 302 http://a.library$request_uri;
		#$scheme://a-library;
	}
	
	upstream a_library {
		# Important: listening on the same port as set in config.json
		server 127.0.0.1:8080;
	}
	
	server {
		listen 80;
		server_name a.library;
		root /var/www/library/public;
		index index.html index.htm;
	
		location / {
			try_files $uri @node;
		}
	
		# serve documents statically through nginx
		location ~* ^/!/(.+\.(?:pdf|epub))$ {
			# Important: alias should be the directory where database is stored
			alias /media/usb/tmp/;
			#add_header X-Whom www-a-library;
			try_files $1 @node;
		}
		
		location @node {
			proxy_set_header Host $http_host;
			proxy_set_header X-Forwarded-For $remote_addr;
			proxy_pass http://a_library;
		}
	
	}
	```
	
	Generate a self signed certificate for Nginx.
	
	```sh 
	apt-get install openssl
	sudo mkdir /etc/nginx/ssl 
	sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/nginx/ssl/nginx.key -out /etc/nginx/ssl/nginx.crt
	```
	
	Activate proxy by creating a symbolic link to /etc/nginx/sites-enabled/
	and restarting Nginx.
	
	```sh 
	sudo ln -s /etc/nginx/sites-available/alibrary /etc/nginx/sites-enabled/
	#remove default site settings
	rm /etc/nginx/sites-enabled/default
	sudo service nginx restart
	```
	
6. #### Set up static ip addresses 
	
	add the following lines to `/etc/dhcpcd.conf` to set static ip addresses for both `wan0` and `eth0`.
	
	```
	interface wlan0
	static ip_address=172.24.1.1/24
	
	interface eth0
	static ip_address=192.168.3.10/24
	static routers=192.168.3.1
	static domain_name_servers=192.168.3.1
	```
	
	Stop `wpa_supplicant` from messing around with setting up wlan0 as an access point. Open `/etc/network/interfaces` and comment out the line containing `wpa-conf` in the `wlan0` section, so that it looks like this:
	
	```sh 
	allow-hotplug wlan0  
	iface wlan0 inet manual  
	#    wpa-conf /etc/wpa_supplicant/wpa_supplicant.conf
	```
	
	Restart dhcpcd `sudo service dhcpcd restart` to assign static addresses.

7. #### Configure Hostapd
	
	Make a new config file `sudo nano /etc/hostapd/hostapd.conf` with the following settings.
	
	```sh
	# This is the name of the WiFi interface we configured above
	interface=wlan0
	
	# Use the nl80211 driver with the brcmfmac driver
	driver=nl80211
	
	# This is the name of the network
	ssid=a-library
	
	# Use the 2.4GHz band
	hw_mode=g
	
	# Use channel 6
	channel=6
	
	# Enable 802.11n
	ieee80211n=1
	
	# Enable WMM
	wmm_enabled=1
	
	# Enable 40MHz channels with 20ns guard interval
	ht_capab=[HT40][SHORT-GI-20][DSSS_CCK-40]
	
	# Accept all MAC addresses
	macaddr_acl=0
	
	# Require clients to know the network name
	ignore_broadcast_ssid=0
	```
	
	You can check if this works by running `sudo /usr/sbin/hostapd /etc/hostapd/hostapd.conf`. If you look for wifi networks now you should see 'a-library' available. CTRL-C to kill the process.
	
	Tell hostapd to use this config file to use this config file by 
	opening up the default configuration file - `sudo nano /etc/default/hostapd`.
	Replace the line `#DAEMON_CONF=""` with `DAEMON_CONF="/etc/hostapd/hostapd.conf"`.

8. #### Configure DNSMasq
	
	Replace the default settings with a clean copy:
	
	```sh 
	sudo mv /etc/dnsmasq.conf /etc/dnsmasq.conf.orig  
	sudo nano /etc/dnsmasq.conf  
	```
	
	Use the following settings:
	
	```sh
	interface=wlan0      # Use interface wlan0  
	bind-interfaces      # Bind to the interface to make sure we aren't sending things elsewhere  
	server=8.8.8.8       # Forward DNS requests to Google DNS  
	domain-needed        # Don't forward short names  
	bogus-priv           # Never forward addresses in the non-routed address spaces.  
	dhcp-range=172.24.1.50,172.24.1.150,12h # Assign IP addresses between 172.24.1.50 and 172.24.1.150 with a 12 hour lease time 
	```
	
	To redirect all traffic to the address a.library you need to set up a custom dnsmasq rule.
	
	`sudo echo address=/#/172.24.1.1 > /etc/dnsmasq.d/a-library`
	
	This will automatically assign the ip 172.24.1.1 to all domain names. Nginx listens to all traffic and directs the requests to a.library. This only partially works for https traffic, as browsers with strong security will reject the self-signed certificate that nginx serves.

9. #### Start Hostapd and DNSMasq
	
	Start hostapd and dnsmasq to make a-library discoverable via wifi.
	
	sudo service hostapd start  
	sudo service dnsmasq start

10. #### Finally
	
	There is an issue with dnsmasq starting before hostapd on startup. A dirty fix is to restart dnsmasq by adding `service dnsmasq restart` to rc.local.
	
	The rc.local should look something like this:
	
	```sh 
	#!/bin/sh -e
	#
	# rc.local
	#
	# This script is executed at the end of each multiuser runlevel.
	# Make sure that the script will "exit 0" on success or any other
	# value on error.
	
	# Print the IP address
	_IP=$(hostname -I) || true
	if [ "$_IP" ]; then
	  printf "My IP address is %s\n" "$_IP"
	fi
	
	printf "Configuring DNSMasq\n"
	sudo service dnsmasq restart
	
	exit 0
	
	```

## Make filesystem read only

**Note: this is currently breaking due to PM2**

Back up fstab `sudo cp /etc/fstab /etc/fstab.original`.
Then change `/etc/fstab` file to:

```
proc            /proc            proc    defaults  0       0
/dev/mmcblk0p6  /boot            vfat    ro        0       2
/dev/mmcblk0p7  /                ext4    ro        0       1
tmpfs           /tmp             tmpfs   defaults,noatime,mode=1777      0       0
tmpfs           /var/log         tmpfs   defaults,noatime,mode=0755      0       0
tmpfs           /var/log/nginx   tmpfs   defaults,noatime,mode=0755      0       0
tmpfs           /var/lib/systemd tmpfs   defaults,noatime,mode=0755      0       0
tmpfs           /run             tmpfs   defaults,noatime,mode=0755      0       0

/dev/sda        /media/usb/      vfat    auto,users,rw,uid=1001,gid=1001,umask=0002 0 0

```

DHCP and DNSMasq will fail to start in a readonly system because they need to write information to their lease files.
This is easily easily solved by creating symbolic links to the tmp directory.

```sh
# for dhcp.leases
rm -rf /var/lib/dhcp/
ln -s /tmp /var/lib/dhcp

# for dnsmasq.leases
sudo rm -rf /var/lib/misc/
sudo ln -s /temp /var/lib/misc
```

PM2 at this point still fails as it trys to create pid, socket and log files.

These instructions are an amalgamation from these sources:

- http://www.matteomattei.com/web-kiosk-with-raspberry-pi-and-read-only-sd/
- http://blog.gegg.us/2014/03/a-raspbian-read-only-root-fs-howto/
- https://wiki.debian.org/ReadonlyRoot

## To do:

*Raspberry pi:*
* Set up Rpi to be read only.
* Automatic daily backups of the library to external usb.

*Interface:*
* Simple search
* Paginate
* Feature random text at the top
