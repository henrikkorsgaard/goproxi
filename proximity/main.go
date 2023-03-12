package main


import (

	"github.com/henrikkorsgaard/goproxi/proximity/network"
)
/*
Setting interface in monitor mode: https://sandilands.info/sgordon/capturing-wifi-in-monitor-mode-with-iw

sudo iw phy phy0 interface add gomon type monitor

sudo ifconfig gomon up

https://medium.com/a-bit-off/sniffing-network-go-6753cae91d3f

https://www.devdungeon.com/content/packet-capture-injection-and-analysis-gopacket


*/

func main(){

	network.MonitorNetworkTraffic("gomon")
	
}