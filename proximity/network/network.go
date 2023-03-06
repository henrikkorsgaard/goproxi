package network

import (
	"fmt"
	"log"
	"github.com/google/gopacket"
	"github.com/google/gopacket/layers"
	"github.com/google/gopacket/pcap"
)



func MonitorNetworkTraffic(iface string) {
	/*
		When we open live on a wifi device, we get a handle with only the radioTap linktype and 802.11 plus radiotap header. That give us access to the following packets:
		radioLayer:https://pkg.go.dev/github.com/google/gopacket@v1.1.19/layers#RadioTap
		dot11Layer: https://pkg.go.dev/github.com/google/gopacket@v1.1.19/layers#Dot11

		any other linklayer will be empty
		See on decryption: https://security.stackexchange.com/a/186116
	*/

	handle, err := pcap.OpenLive(iface, 96, true, pcap.BlockForever)
	defer handle.Close()
	if err != nil {
		log.Fatal(err)
	}

	var radioLayer layers.RadioTap
	var dot11Layer layers.Dot11
	
	parser := gopacket.NewDecodingLayerParser(
		layers.LayerTypeRadioTap,
		&radioLayer,
		&dot11Layer,
	)

	foundLayerTypes := []gopacket.LayerType{}

	for {
		packet,_,err := handle.ReadPacketData()
		if err != nil {
			log.Fatal(err)
		}

		parser.DecodeLayers(packet, &foundLayerTypes)
		//see: https://networkengineering.stackexchange.com/questions/25100/four-layer-2-addresses-in-802-11-frame-header
		//The ideal case for capturing signal strength between the node and device
		//is when addr1 and addr3 is equal to the station mac and addr2 is not equal
		//to station mac
		if len(foundLayerTypes) >= 2 && radioLayer.DBMAntennaSignal != 0 {
		
			fmt.Println(radioLayer.DBMAntennaSignal)
			fmt.Println(dot11Layer.Address1.String())
			fmt.Println(dot11Layer.Address2.String())
			fmt.Println(dot11Layer.Address3.String())
			fmt.Println(dot11Layer.Address4.String())
		}
	}
}
