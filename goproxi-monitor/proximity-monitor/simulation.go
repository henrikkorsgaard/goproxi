package proximity_monitor

import (
	"github.com/google/gopacket"
	"github.com/google/gopacket/layers"
	"github.com/google/gopacket/pcap"
)
func Monitor(monNetIface string){
	handle, err := pcap.OpenLive(monNetIface, snapLen, true, pcap.BlockForever)
	if err != nil {
		log.Fatalf(err)
	}

	packetSource := gopacket.NewPacketSource(handle,handle.LinkType())

	parser := gopacket.NewDecodingLayerParser(
		layers.LayerTypeRadioTap,
		&radioLayer,
		&dot11layer,
	)

	foundLayerTypes := []gopacket.LayerType{}
	for packet := range packetSource.Packets() {
		parser.DecodeLayers(packet.Data(), &foundLayerTypes)
		fmt.Printf("%#v\n", radioLayer)
		fmt.Printf("%#v\n", dot11Layer)		
	}
}

// Starte med at lave en reader der kan dumpe lidt information til os

// Vi ved endnu ikke hvordan vi spoofer radioLayers og dot11 layers


/*
* monitorNetworkTraffic initiates packet monitoring using pcap.
* It will use the network interface defined in the initial config.
* Packets will be detected by the handlePacket function below
* TODO: Consider using a more complex filter

func monitorNetworkTraffic(ch chan *proxiDevice) {
	fmt.Println("starting to scan")
	handle, err := pcap.OpenLive("go-mon", snapLen, true, pcap.BlockForever)
	logging.Fatal(err)

	monitorHandle = handle
	defer monitorHandle.Close()

	// Set filter
	var filter = "not broadcast" //TODO: ADD DESTINATION/SOURCE TO THE FILTER TO AVOID GETTING TOO MANY PACKETS
	err = monitorHandle.SetBPFFilter(filter)
	if err != nil {
		log.Fatal(err)
	}

	packetSource := gopacket.NewPacketSource(monitorHandle, monitorHandle.LinkType())

	parser := gopacket.NewDecodingLayerParser(
		layers.LayerTypeRadioTap,
		&radioLayer,
		&dot11layer,
	)

	foundLayerTypes := []gopacket.LayerType{}

	for packet := range packetSource.Packets() {

		parser.DecodeLayers(packet.Data(), &foundLayerTypes)

		if len(foundLayerTypes) >= 2 && radioLayer.DBMAntennaSignal != 0 {

			station := configuration.StationMac()
			addr1 := dot11layer.Address1.String()
			addr2 := dot11layer.Address2.String()
			addr3 := dot11layer.Address3.String()

			//see: https://networkengineering.stackexchange.com/questions/25100/four-layer-2-addresses-in-802-11-frame-header
			//The ideal case for capturing signal strength between the node and device
			//is when addr1 and addr3 is equal to the station mac and addr2 is not equal
			//to station mac

			if addr1 == station && addr3 == station && addr2 != station {
		
				signal := radioLayer.DBMAntennaSignal
				mac := dot11layer.Address2.String()

				ch <- &proxiDevice{
					MAC:    mac,
					Signal: int(signal),
				}
			}
		}
	}
}
*/