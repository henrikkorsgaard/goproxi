package network

import (
	"net"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/google/gopacket"
	"github.com/google/gopacket/layers"
)


func TestHandlePacketDeviceIdentification(t *testing.T){
	
	stationMac, _ := net.ParseMAC("e9:e9:e9:e9:e9:e9") 
	clientMac, _ := net.ParseMAC("c3:c3:c3:c3:c3:c3")
	
	radioLayer := &layers.RadioTap {
		DBMAntennaSignal: -50,
		Length:9, //Set lengt to aling with the packet parsing (to compensate for lacking content)
		Present:32, //Indicating DBMAntennaSignal present
	}
	dot11Layer := &layers.Dot11 {
		Address1: stationMac,
		Address2: clientMac,
	}

	dot11MgtLayer := &layers.Dot11MgmtAssociationReq {}

	dot11InfoLayer := &layers.Dot11InformationElement {
		ID:layers.Dot11InformationElementID(0),
		Info: []byte("TEST"),
	}

	buffer := gopacket.NewSerializeBuffer()
	options := gopacket.SerializeOptions{}

    gopacket.SerializeLayers(buffer, options,
        radioLayer,
        dot11Layer,
		dot11MgtLayer,
		dot11InfoLayer,
        gopacket.Payload([]byte{}),
    )
	
	testPacket := gopacket.NewPacket(
		buffer.Bytes(),
		layers.LayerTypeRadioTap,
		gopacket.Default,
	)

	device, err := handlePacket(testPacket, stationMac)
	if err != nil {
		t.Fatalf("Unexpected error from HandlePacket: %v", err)
	}

	expectedDevice := Device{MacAddr: clientMac, Signal:-50}

	assert.Equal(t,expectedDevice, device)
}

func TestHandlePacketErrorOnMissingSignal(t *testing.T){
	
	stationMac, _ := net.ParseMAC("e9:e9:e9:e9:e9:e9") 
	clientMac, _ := net.ParseMAC("c3:c3:c3:c3:c3:c3")
	
	radioLayer := &layers.RadioTap {
		//DBMAntennaSignal: -50,
		Length:9, //Set lengt to aling with the packet parsing (to compensate for lacking content)
		Present:32, //Indicating DBMAntennaSignal present
	}
	dot11Layer := &layers.Dot11 {
		Address1: stationMac,
		Address2: clientMac,
	}

	dot11MgtLayer := &layers.Dot11MgmtAssociationReq {}

	dot11InfoLayer := &layers.Dot11InformationElement {
		ID:layers.Dot11InformationElementID(0),
		Info: []byte("TEST"),
	}

	buffer := gopacket.NewSerializeBuffer()
	options := gopacket.SerializeOptions{}

    gopacket.SerializeLayers(buffer, options,
        radioLayer,
        dot11Layer,
		dot11MgtLayer,
		dot11InfoLayer,
        gopacket.Payload([]byte{}),
    )
	
	testPacket := gopacket.NewPacket(
		buffer.Bytes(),
		layers.LayerTypeRadioTap,
		gopacket.Default,
	)

	_, err := handlePacket(testPacket, stationMac)
	if err == nil {
		t.Error("A missing RadioTap signal layer should return error")
	} 
}

func TestHandlePacketErrorOnMissingMacAddress(t *testing.T){
	
	stationMac, _ := net.ParseMAC("e9:e9:e9:e9:e9:e9") 
	
	dot11Layer := &layers.Dot11 {
		Address1: stationMac,
	}

	dot11MgtLayer := &layers.Dot11MgmtAssociationReq {}

	dot11InfoLayer := &layers.Dot11InformationElement {
		ID:layers.Dot11InformationElementID(0),
		Info: []byte("TEST"),
	}

	buffer := gopacket.NewSerializeBuffer()
	options := gopacket.SerializeOptions{}

    gopacket.SerializeLayers(buffer, options,
        dot11Layer,
		dot11MgtLayer,
		dot11InfoLayer,
        gopacket.Payload([]byte{}),
    )
	
	testPacket := gopacket.NewPacket(
		buffer.Bytes(),
		layers.LayerTypeRadioTap,
		gopacket.Default,
	)

	_, err := handlePacket(testPacket, stationMac)
	if err == nil {
		t.Error("A missing Dot11 1/2 layer should return error")
	}
}

func TestHandlePacketErrorOnMissingRadioTapLayer(t *testing.T){
	
	stationMac, _ := net.ParseMAC("e9:e9:e9:e9:e9:e9") 
	clientMac, _ := net.ParseMAC("c3:c3:c3:c3:c3:c3")
	
	dot11Layer := &layers.Dot11 {
		Address1: stationMac,
		Address2: clientMac,
	}

	dot11MgtLayer := &layers.Dot11MgmtAssociationReq {}

	dot11InfoLayer := &layers.Dot11InformationElement {
		ID:layers.Dot11InformationElementID(0),
		Info: []byte("TEST"),
	}

	buffer := gopacket.NewSerializeBuffer()
	options := gopacket.SerializeOptions{}

    gopacket.SerializeLayers(buffer, options,
        dot11Layer,
		dot11MgtLayer,
		dot11InfoLayer,
        gopacket.Payload([]byte{}),
    )
	
	testPacket := gopacket.NewPacket(
		buffer.Bytes(),
		layers.LayerTypeRadioTap,
		gopacket.Default,
	)

	_, err := handlePacket(testPacket, stationMac)
	if err == nil {
		t.Error("Packets missing layers should return error")
	}
}
