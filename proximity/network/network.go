package network

import (
	"fmt"
	"log"
	"github.com/google/gopacket"
	"github.com/google/gopacket/layers"
	"github.com/google/gopacket/pcap"
)

func MonitorNetworkTraffic(iface string) {
	handle, err := pcap.OpenLive(iface, 96, true, pcap.BlockForever)
	defer handle.Close()
	if err != nil {
		log.Fatal(err)
	}
	
	packetSource := gopacket.NewPacketSource(handle, handle.LinkType())

	var radioLayer layers.RadioTap
	var dot11Layer layers.Dot11

	parser := gopacket.NewDecodingLayerParser(
		layers.LayerTypeRadioTap,
		&radioLayer,
		&dot11Layer,
		//We need more packet layers for the simulator, but lets see
	)

	foundLayerTypes := []gopacket.LayerType{}
	for packet := range packetSource.Packets() {

		parser.DecodeLayers(packet.Data(), &foundLayerTypes)

		for packet := range packetSource.Packets() {
			parser.DecodeLayers(packet.Data(), &foundLayerTypes)
			fmt.Printf("%#v\n", radioLayer)
			fmt.Printf("%#v\n", dot11Layer)		
		}
	}
}