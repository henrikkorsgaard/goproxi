package network

import (
	"net"
	"log"
	"github.com/google/gopacket"
	"github.com/google/gopacket/layers"
	"github.com/google/gopacket/pcap"
)



type DeviceNotFound struct{
	Msg string
}

func (de DeviceNotFound) Error() string {
	return "DeviceNotFound: " + de.Msg
}

type Device struct {
	MacAddr net.HardwareAddr
	Signal int8
}

/*
type Device struct {
	HardwareAddr net.HardwareAddr
	Signal int 
}*/

//If this becomes more complex, we should initiate it as a struct and then do .Monitor()
func MonitorNetworkTraffic(iface string) {
	stationMac, _ := net.ParseMAC("e9:e9:e9:e9:e9:e9") 
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

	packetSource := gopacket.NewPacketSource(handle, handle.LinkType())
    for packet := range packetSource.Packets() {
        handlePacket(packet, stationMac)
    }

}

func handlePacket(packet gopacket.Packet, station net.HardwareAddr) (Device, error){
	dot11Layer := packet.Layer(layers.LayerTypeDot11)
	radioTapLayer := packet.Layer(layers.LayerTypeRadioTap)

	d := Device{}
	
	if dot11Layer != nil && radioTapLayer != nil {
		radio := radioTapLayer.(*layers.RadioTap)
		dot11 := dot11Layer.(*layers.Dot11)

		if dot11.Address1 == nil || dot11.Address2 == nil {
			return d, DeviceNotFound{Msg: "Missing dot11 Address1 or Address2"}
		}

		if radio.DBMAntennaSignal >= 0 {
			return d, DeviceNotFound{Msg: "Missing RadioTap DBMAntennaSignal"}
		}

		d.Signal = radio.DBMAntennaSignal
		
		if dot11.Address1.String() == station.String() {
			d.MacAddr = dot11.Address2
		} else if dot11.Address2.String() == station.String() {
			d.MacAddr = dot11.Address1
		} else {
			return d, DeviceNotFound{Msg: "Device not affiliated with the network we are monitoring"}
		}

	} else {
		return d, DeviceNotFound{Msg: "Missing Dot11 or RadioTap layer."}
	}

	return d, nil
}